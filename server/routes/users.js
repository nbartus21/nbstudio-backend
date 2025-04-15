import express from 'express';
import * as userService from '../services/userService.js';
import userAuthMiddleware, { adminOnly } from '../middleware/userAuth.js';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Felhasználó bejelentkezése
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email és jelszó megadása kötelező' });
    }
    
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Hibás email vagy jelszó' });
    }
    
    // Kliens felhasználó esetén ellenőrizzük, hogy aktív-e
    if (user.role === 'client' && !user.active) {
      return res.status(403).json({ message: 'A felhasználói fiók inaktív' });
    }
    
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Hibás email vagy jelszó' });
    }
    
    // JWT token generálása
    const token = userService.generateToken(user);
    
    // Utolsó bejelentkezés idejének frissítése
    user.lastLoginAt = new Date();
    await user.save();
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language
      }
    });
  } catch (error) {
    console.error('Bejelentkezési hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Jelszó visszaállítási kérelem
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, language } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email cím megadása kötelező' });
    }
    
    // Ellenőrizzük, hogy létezik-e a felhasználó
    const user = await userService.getUserByEmail(email);
    if (!user) {
      // Biztonsági okokból ne adjunk információt arról, hogy létezik-e a felhasználó
      return res.json({ message: 'Ha a megadott email címhez tartozik fiók, akkor küldtünk egy jelszó visszaállító linket' });
    }
    
    // Jelszó visszaállító token generálása és email küldése
    await userService.generatePasswordResetToken(email, language || user.language);
    
    res.json({ message: 'Jelszó visszaállító link elküldve a megadott email címre' });
  } catch (error) {
    console.error('Jelszó visszaállítási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Jelszó visszaállítása token alapján
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: 'Token és új jelszó megadása kötelező' });
    }
    
    // Jelszó visszaállítása
    await userService.resetPassword(token, password);
    
    res.json({ message: 'Jelszó sikeresen visszaállítva' });
  } catch (error) {
    console.error('Jelszó visszaállítási hiba:', error);
    res.status(400).json({ message: error.message });
  }
});

// Saját felhasználói adatok lekérése
router.get('/me', userAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userData.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Felhasználói adatok lekérési hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Saját projektek lekérése kliens felhasználóként
router.get('/me/projects', userAuthMiddleware, async (req, res) => {
  try {
    // Csak a felhasználóhoz rendelt projektek lekérése
    const projects = await Project.find({ _id: { $in: req.userData.projects } });
    
    res.json(projects);
  } catch (error) {
    console.error('Projektek lekérési hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Jelszó módosítása
router.put('/me/password', userAuthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Jelenlegi és új jelszó megadása kötelező' });
    }
    
    const user = await User.findById(req.userData.id);
    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található' });
    }
    
    // Jelenlegi jelszó ellenőrzése
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Hibás jelenlegi jelszó' });
    }
    
    // Új jelszó beállítása
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Jelszó sikeresen módosítva' });
  } catch (error) {
    console.error('Jelszó módosítási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Saját adatok módosítása
router.put('/me', userAuthMiddleware, async (req, res) => {
  try {
    const { name, language, phone, companyName } = req.body;
    
    const user = await User.findById(req.userData.id);
    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található' });
    }
    
    // Módosítható adatok frissítése
    if (name) user.name = name;
    if (language) user.language = language;
    if (phone !== undefined) user.phone = phone;
    if (companyName !== undefined) user.companyName = companyName;
    
    // Cím adatok frissítése
    if (req.body.address) {
      user.address = {
        ...user.address,
        ...req.body.address
      };
    }
    
    await user.save();
    
    res.json({
      message: 'Felhasználói adatok sikeresen módosítva',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        phone: user.phone,
        companyName: user.companyName,
        address: user.address
      }
    });
  } catch (error) {
    console.error('Felhasználói adatok módosítási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// *** ADMIN VÉGPONTOK ***

// Összes felhasználó lekérése (csak admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Felhasználók lekérési hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Új felhasználó létrehozása (csak admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { email, name, role, language, projects, companyName, phone } = req.body;
    
    // Validáció
    if (!email || !name) {
      return res.status(400).json({ message: 'Email és név megadása kötelező' });
    }
    
    // Ellenőrizzük, hogy az email már használatban van-e
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Ez az email cím már használatban van' });
    }
    
    // Generálunk egy véletlenszerű jelszót
    const password = uuidv4().substring(0, 8);
    
    // Létrehozzuk a felhasználót
    const userData = {
      email,
      password,
      name,
      role: role || 'client',
      language: language || 'hu',
      companyName,
      phone,
      active: true
    };
    
    const user = await userService.createUser(userData);
    
    // Projektek hozzáadása a felhasználóhoz, ha meg vannak adva
    if (projects && Array.isArray(projects) && projects.length > 0) {
      for (const projectId of projects) {
        await userService.addProjectToUser(user._id, projectId);
      }
    }
    
    // Üdvözlő email küldése a felhasználónak
    await userService.sendWelcomeEmail(user, password, user.language);
    
    res.status(201).json({
      message: 'Felhasználó sikeresen létrehozva és értesítő email elküldve',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language
      }
    });
  } catch (error) {
    console.error('Felhasználó létrehozási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Felhasználó lekérése ID alapján (csak admin)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Felhasználó lekérési hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Felhasználó módosítása (csak admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, email, role, language, active, companyName, phone } = req.body;
    
    // Ellenőrizzük, hogy a felhasználó létezik-e
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található' });
    }
    
    // Email módosítás esetén ellenőrizzük, hogy az új email már használatban van-e
    if (email && email !== user.email) {
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Ez az email cím már használatban van' });
      }
      user.email = email;
    }
    
    // Többi adat módosítása
    if (name) user.name = name;
    if (role) user.role = role;
    if (language) user.language = language;
    if (typeof active === 'boolean') user.active = active;
    if (companyName !== undefined) user.companyName = companyName;
    if (phone !== undefined) user.phone = phone;
    
    // Cím adatok frissítése
    if (req.body.address) {
      user.address = {
        ...user.address,
        ...req.body.address
      };
    }
    
    await user.save();
    
    // Csak a szükséges adatokat küldjük vissza
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language,
      active: user.active,
      companyName: user.companyName,
      phone: user.phone,
      address: user.address
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Felhasználó módosítási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Felhasználó törlése (csak admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Felhasználó sikeresen törölve' });
  } catch (error) {
    console.error('Felhasználó törlési hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Projekt hozzáadása felhasználóhoz (csak admin)
router.post('/:id/projects', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.body;
    
    await userService.addProjectToUser(req.params.id, projectId);
    
    res.json({ message: 'Projekt sikeresen hozzáadva a felhasználóhoz' });
  } catch (error) {
    console.error('Projekt hozzáadási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Projekt eltávolítása felhasználótól (csak admin)
router.delete('/:id/projects/:projectId', authMiddleware, async (req, res) => {
  try {
    await userService.removeProjectFromUser(req.params.id, req.params.projectId);
    res.json({ message: 'Projekt sikeresen eltávolítva a felhasználótól' });
  } catch (error) {
    console.error('Projekt eltávolítási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Felhasználó jelszavának visszaállítása (csak admin)
router.post('/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    await userService.resetPasswordByAdmin(req.params.id);
    res.json({ message: 'Jelszó sikeresen visszaállítva és elküldve a felhasználónak' });
  } catch (error) {
    console.error('Jelszó visszaállítási hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

export default router; 