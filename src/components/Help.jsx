import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, X, ArrowRight, ChevronDown, ChevronUp, 
  Mail, Phone, ExternalLink, Check, Info, AlertTriangle,
  Download, Copy, Share2
} from 'lucide-react';

// SVG Illusztrációk - modern helpsystem
const HelpIllustration = () => (
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="96" stroke="#e2e8f0" strokeWidth="8"/>
    <circle cx="100" cy="100" r="70" fill="#3b82f6" fillOpacity="0.1"/>
    <path d="M100 60V110M100 130V140" stroke="#3b82f6" strokeWidth="10" strokeLinecap="round"/>
  </svg>
);

const SupportIllustration = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="40" width="140" height="100" rx="8" fill="#e2e8f0"/>
    <rect x="30" y="60" width="120" height="70" rx="4" fill="white"/>
    <path d="M50 80L80 100L110 80" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round"/>
    <path d="M50 120L70 105" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round"/>
    <path d="M110 120L90 105" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const DocumentIllustration = () => (
  <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 20H95L120 45V140H40V20Z" fill="#e2e8f0"/>
    <path d="M95 20V45H120L95 20Z" fill="#94a3b8"/>
    <path d="M60 65H100" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round"/>
    <path d="M60 85H100" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round"/>
    <path d="M60 105H80" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

// Fő komponensek
const QuickLink = ({ icon, title, description, to, external = false }) => {
  const LinkComponent = external ? 'a' : Link;
  const linkProps = external ? { href: to, target: "_blank", rel: "noopener noreferrer" } : { to };
  
  return (
    <LinkComponent 
      {...linkProps} 
      className="flex flex-col items-center p-4 sm:p-5 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300 text-center h-full"
    >
      <div className="text-blue-500 mb-3">
        {icon}
      </div>
      <h3 className="text-gray-800 font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm flex-grow">{description}</p>
      <div className="mt-4 text-blue-600 flex items-center justify-center text-sm font-medium">
        {external ? (
          <>
            Megnyitás <ExternalLink size={14} className="ml-1" />
          </>
        ) : (
          <>
            Tovább <ArrowRight size={14} className="ml-1" />
          </>
        )}
      </div>
    </LinkComponent>
  );
};

const Faq = ({ question, answer, isOpen, toggle }) => {
  return (
    <div className="border-b border-gray-200">
      <button
        className="flex justify-between items-center w-full py-4 text-left focus:outline-none"
        onClick={toggle}
      >
        <h3 className="text-md sm:text-lg font-medium text-gray-800">{question}</h3>
        <div className="text-blue-500">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[500px] opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-gray-600">{answer}</p>
      </div>
    </div>
  );
};

const SearchBar = ({ value, onChange, onSubmit, placeholder = "Keresés a súgóban..." }) => (
  <form onSubmit={onSubmit} className="relative w-full mb-8">
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search size={18} className="text-gray-400" />
    </div>
    {value && (
      <button 
        type="button" 
        onClick={() => onChange({ target: { value: '' } })}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X size={18} />
      </button>
    )}
  </form>
);

const HelpSection = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">{title}</h2>
    {children}
  </section>
);

// Fő Help komponens
const Help = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Szimuláljuk a betöltést
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    
    return () => clearTimeout(timer);
  }, []);

  // Toggle accordion
  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  // Handle search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      console.log('Searching for:', searchTerm);
      // Itt lehetne valós keresési logika
    }
  };

  // Betöltő képernyő
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 max-w-5xl py-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-pulse w-full max-w-3xl">
          <div className="h-8 bg-gray-200 rounded-full w-3/4 mx-auto mb-10"></div>
          <div className="h-12 bg-gray-200 rounded-lg w-full mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-1/2 mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // FAQ adatok
  const faqData = [
    {
      question: "Hogyan tudok új projektet létrehozni?",
      answer: "Új projekt létrehozásához navigálj a 'Projektek' menübe, majd kattints az 'Új projekt létrehozása' gombra. Töltsd ki a szükséges mezőket, majd mentsd el a projektet a 'Létrehozás' gomb megnyomásával."
    },
    {
      question: "Hogyan tudok dokumentumokat feltölteni?",
      answer: "A dokumentumok feltöltéséhez nyisd meg az adott projektet, majd kattints a 'Dokumentumok' fülre. Itt találsz egy 'Dokumentum feltöltése' gombot, amelyre kattintva választhatsz fájlt a számítógépedről."
    },
    {
      question: "Hogyan menedzselhetem a domain-eket?",
      answer: "A domain-ek kezeléséhez navigálj a 'Szolgáltatások' menüben a 'Domain Kezelő' opcióra. Itt láthatod az összes domain-t, szerkesztheted azokat, és újakat is hozzáadhatsz."
    },
    {
      question: "Hogyan használhatom az AI asszisztenst?",
      answer: "Az AI asszisztens használatához kattints a 'Szolgáltatások' menüben az 'AI Asszisztens' opcióra. Írd be a kérdésedet vagy kérésedet a szövegmezőbe, majd küldd el. Az asszisztens azonnal válaszolni fog."
    },
    {
      question: "Hogyan tudok új support jegyet nyitni?",
      answer: "Support jegy nyitásához navigálj a 'Szolgáltatások' menüben a 'Support Ticketek' oldalra, majd kattints az 'Új jegy' gombra. Töltsd ki a szükséges információkat, add meg a prioritást és a részleteket, majd mentsd el."
    },
    {
      question: "Hogyan működik a számlázás az alkalmazásban?",
      answer: "A számlázási funkciókhoz navigálj a 'Projektek' menüben a 'Számla Kezelő' opcióra. Itt létrehozhatsz új számlákat, követheted a kifizetéseket, és lekérdezheted a korábbi számlákat is."
    }
  ];

  // Dokumentum adatok (példa)
  const documents = [
    {
      title: "Felhasználói kézikönyv",
      description: "Átfogó leírás az NB Studio összes funkciójáról",
      icon: <Download size={22} />,
      action: "Letöltés"
    },
    {
      title: "Gyorskalauz",
      description: "A legfontosabb funkciók gyors áttekintése",
      icon: <Copy size={22} />,
      action: "Megnyitás"
    },
    {
      title: "Videó oktatóanyagok",
      description: "Lépésről lépésre bemutató videók",
      icon: <ExternalLink size={22} />,
      action: "Lejátszás"
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl py-10">
        {/* Fejléc */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <HelpIllustration />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Segítség és támogatás</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Üdvözöljük az NB Studio súgóközpontjában. Itt megtalálhatja a válaszokat a gyakori kérdésekre és útmutatást a rendszer használatához.
          </p>
        </div>

        {/* Keresés */}
        <SearchBar 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSubmit={handleSearchSubmit}
        />

        {/* Gyors linkek */}
        <HelpSection title="Gyors elérés">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <QuickLink 
              icon={<Mail size={32} />}
              title="Kapcsolatfelvétel"
              description="Vegye fel a kapcsolatot ügyfélszolgálatunkkal e-mailben"
              to="/contacts"
            />
            <QuickLink 
              icon={<Phone size={32} />}
              title="Telefonos támogatás"
              description="Hívjon minket munkanapokon 9:00-17:00 között"
              to="tel:+3630123456"
              external={true}
            />
            <QuickLink 
              icon={<MessageCircle size={32} />}
              title="AI Asszisztens"
              description="Azonnali segítség a beépített AI asszisztenstől"
              to="/ai-chat"
            />
          </div>
        </HelpSection>

        {/* Gyakori kérdések */}
        <HelpSection title="Gyakori kérdések">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            {faqData.map((faq, index) => (
              <Faq
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={activeAccordion === index}
                toggle={() => toggleAccordion(index)}
              />
            ))}
          </div>
        </HelpSection>

        {/* Útmutatók és dokumentáció */}
        <HelpSection title="Dokumentáció és útmutatók">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {documents.map((doc, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col items-start"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{doc.title}</h3>
                <p className="text-gray-600 text-sm mb-4 flex-grow">{doc.description}</p>
                <button className="text-blue-600 flex items-center text-sm font-medium hover:text-blue-800">
                  {doc.icon}
                  <span className="ml-2">{doc.action}</span>
                </button>
              </div>
            ))}
          </div>
        </HelpSection>

        {/* Támogatás és kapcsolat */}
        <HelpSection title="Segítségre van szüksége?">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <SupportIllustration />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Támogatás kérése</h3>
              <p className="text-gray-600 mb-4">
                Ha nem találja a választ a kérdésére, nyisson egy támogatási jegyet és csapatunk hamarosan válaszol.
              </p>
              <Link 
                to="/support" 
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Support jegy nyitása
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <DocumentIllustration />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Dokumentumok böngészése</h3>
              <p className="text-gray-600 mb-4">
                Részletes dokumentációnkban megtalálja a rendszer minden funkciójának leírását és használati útmutatóját.
              </p>
              <Link 
                to="/documents" 
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Dokumentumtár
              </Link>
            </div>
          </div>
        </HelpSection>

        {/* Tippek és trükkök */}
        <HelpSection title="Tippek és hasznos tudnivalók">
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Gyorsbillentyűk:</strong> Használja a <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl+K</kbd> billentyűkombinációt a gyorskereséshez.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <strong>Mentés automatikusan:</strong> A rendszer 5 percenként automatikusan menti a folyamatban lévő munkáját.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Kijelentkezés:</strong> Biztonsági okokból 30 perc inaktivitás után a rendszer automatikusan kijelentkezteti.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </HelpSection>

        {/* Lábléc */}
        <div className="mt-12 text-center">
          <div className="text-sm text-gray-500 mb-4">
            <p>Nem találta meg, amit keresett?</p>
            <div className="flex justify-center items-center gap-6 mt-3">
              <Link to="/ai-chat" className="text-blue-600 flex items-center hover:text-blue-800">
                <MessageCircle size={16} className="mr-1" /> AI Asszisztens
              </Link>
              <a href="mailto:info@nb-studio.net" className="text-blue-600 flex items-center hover:text-blue-800">
                <Mail size={16} className="mr-1" /> E-mail küldése
              </a>
              <button className="text-blue-600 flex items-center hover:text-blue-800" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                <Share2 size={16} className="mr-1" /> Oldal megosztása
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} NB Studio. Minden jog fenntartva.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;