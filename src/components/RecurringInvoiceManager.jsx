import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  IconButton, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  Grid,
  Stack,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  PlayArrow as GenerateIcon 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { hu } from 'date-fns/locale';
import { api } from '../services/auth';
import { useSnackbar } from 'notistack';

const RecurringInvoiceManager = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [recurringInvoices, setRecurringInvoices] = useState([]);
  const [project, setProject] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [isNewInvoice, setIsNewInvoice] = useState(true);
  
  // Állapot az ismétlődő számla formhoz
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    frequency: 'havi',
    interval: 1,
    startDate: new Date(),
    endDate: null,
    paymentTerms: 15,
    items: [],
    totalAmount: 0,
    notes: '',
    emailNotification: true,
    reminderDays: [3, 7],
    autoSend: true,
    generatePDF: true
  });
  
  // Állapot a számla tételekhez
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0
  });
  
  useEffect(() => {
    fetchData();
  }, [projectId]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Projekt adatok lekérése
      const projectResponse = await api.get(`/api/projects/${projectId}`);
      setProject(projectResponse.data);
      
      // Ismétlődő számlák lekérése
      const invoicesResponse = await api.get(`/api/projects/${projectId}/recurring-invoices`);
      setRecurringInvoices(invoicesResponse.data);
    } catch (error) {
      console.error('Hiba az adatok lekérésekor:', error);
      enqueueSnackbar('Hiba történt az adatok betöltésekor', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setOpenDeleteDialog(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/api/projects/${projectId}/recurring-invoices/${deleteId}`);
      enqueueSnackbar('Ismétlődő számla sikeresen törölve', { variant: 'success' });
      fetchData();
    } catch (error) {
      console.error('Hiba a törlés során:', error);
      enqueueSnackbar('Hiba történt a törlés során', { variant: 'error' });
    } finally {
      setOpenDeleteDialog(false);
      setDeleteId(null);
    }
  };
  
  const handleEditClick = (invoice) => {
    setIsNewInvoice(false);
    setFormData({
      ...invoice,
      startDate: new Date(invoice.startDate),
      endDate: invoice.endDate ? new Date(invoice.endDate) : null
    });
    setItems(invoice.items || []);
    setOpenFormDialog(true);
  };
  
  const handleAddClick = () => {
    setIsNewInvoice(true);
    setFormData({
      name: '',
      description: '',
      isActive: true,
      frequency: 'havi',
      interval: 1,
      startDate: new Date(),
      endDate: null,
      paymentTerms: 15,
      items: [],
      totalAmount: 0,
      notes: '',
      emailNotification: true,
      reminderDays: [3, 7],
      autoSend: true,
      generatePDF: true
    });
    setItems([]);
    setOpenFormDialog(true);
  };
  
  const handleGenerateInvoice = async (id) => {
    try {
      await api.post(`/api/projects/${projectId}/recurring-invoices/${id}/generate`);
      enqueueSnackbar('Számla sikeresen generálva', { variant: 'success' });
      fetchData();
    } catch (error) {
      console.error('Hiba a számla generálás során:', error);
      enqueueSnackbar('Hiba történt a számla generálás során', { variant: 'error' });
    }
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: name === 'quantity' || name === 'unitPrice' ? Number(value) : value }));
  };
  
  const addItem = () => {
    if (!currentItem.name || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
      enqueueSnackbar('Kérjük, töltse ki helyesen a tétel adatait', { variant: 'warning' });
      return;
    }
    
    const newItems = [...items, { ...currentItem, id: Date.now() }];
    setItems(newItems);
    setCurrentItem({
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0
    });
    
    // Számítsuk ki az összeget
    const totalAmount = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setFormData(prev => ({ ...prev, totalAmount }));
  };
  
  const removeItem = (id) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    
    // Számítsuk ki az új összeget
    const totalAmount = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setFormData(prev => ({ ...prev, totalAmount }));
  };
  
  const handleSubmit = async () => {
    try {
      // Form validálás
      if (!formData.name || items.length === 0) {
        enqueueSnackbar('Kérjük, adja meg a számla nevét és legalább egy tételt', { variant: 'warning' });
        return;
      }
      
      const submitData = {
        ...formData,
        items,
        totalAmount: items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      };
      
      if (isNewInvoice) {
        await api.post(`/api/projects/${projectId}/recurring-invoices`, submitData);
        enqueueSnackbar('Ismétlődő számla sikeresen létrehozva', { variant: 'success' });
      } else {
        await api.put(`/api/projects/${projectId}/recurring-invoices/${formData._id}`, submitData);
        enqueueSnackbar('Ismétlődő számla sikeresen frissítve', { variant: 'success' });
      }
      
      setOpenFormDialog(false);
      fetchData();
    } catch (error) {
      console.error('Hiba a mentés során:', error);
      enqueueSnackbar('Hiba történt a mentés során', { variant: 'error' });
    }
  };
  
  const frequencyOptions = [
    { value: 'havi', label: 'Havi' },
    { value: 'negyedéves', label: 'Negyedéves' },
    { value: 'féléves', label: 'Féléves' },
    { value: 'éves', label: 'Éves' },
    { value: 'egyedi', label: 'Egyedi (napokban)' }
  ];
  
  const formatDate = (date) => {
    if (!date) return 'Nincs beállítva';
    return new Date(date).toLocaleDateString('hu-HU');
  };
  
  const getStatusChip = (isActive) => {
    return isActive ? 
      <Chip label="Aktív" color="success" size="small" /> : 
      <Chip label="Inaktív" color="default" size="small" />;
  };
  
  const getNextInvoiceDate = (invoice) => {
    if (!invoice.isActive) return 'Inaktív';
    return formatDate(invoice.nextInvoiceDate);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Ismétlődő számlák kezelése</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Új ismétlődő számla
        </Button>
      </Box>
      
      {project && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6">Projekt: {project.name}</Typography>
          <Typography variant="body1">Ügyfél: {project.client.name}</Typography>
          <Typography variant="body2">Pénznem: {project.financial.currency}</Typography>
        </Paper>
      )}
      
      {recurringInvoices.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">Még nincsenek ismétlődő számlák ehhez a projekthez.</Typography>
          <Button 
            variant="outlined" 
            sx={{ mt: 2 }}
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Új ismétlődő számla létrehozása
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Név</TableCell>
                <TableCell>Állapot</TableCell>
                <TableCell>Gyakoriság</TableCell>
                <TableCell>Összeg</TableCell>
                <TableCell>Következő</TableCell>
                <TableCell>Létrehozva</TableCell>
                <TableCell align="right">Műveletek</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recurringInvoices.map((invoice) => (
                <TableRow key={invoice._id}>
                  <TableCell>
                    <Typography variant="body1">{invoice.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {invoice.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(invoice.isActive)}</TableCell>
                  <TableCell>
                    {frequencyOptions.find(option => option.value === invoice.frequency)?.label || invoice.frequency}
                    {invoice.interval > 1 && ` (${invoice.interval})`}
                  </TableCell>
                  <TableCell>
                    {invoice.totalAmount.toLocaleString('hu-HU')} {project?.financial.currency}
                  </TableCell>
                  <TableCell>{getNextInvoiceDate(invoice)}</TableCell>
                  <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleGenerateInvoice(invoice._id)}
                      title="Számla manuális generálása"
                    >
                      <GenerateIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleEditClick(invoice)}
                      title="Szerkesztés"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteClick(invoice._id)}
                      title="Törlés"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Törlés megerősítő dialógus */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Ismétlődő számla törlése</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Biztosan törölni szeretné ezt az ismétlődő számlát? Ez a művelet nem vonható vissza.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Mégsem</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Törlés
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Ismétlődő számla form dialógus */}
      <Dialog
        open={openFormDialog}
        onClose={() => setOpenFormDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isNewInvoice ? 'Új ismétlődő számla létrehozása' : 'Ismétlődő számla szerkesztése'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={hu}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Név"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Leírás"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Gyakoriság</InputLabel>
                  <Select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleFormChange}
                    label="Gyakoriság"
                  >
                    {frequencyOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Intervallum"
                  name="interval"
                  type="number"
                  value={formData.interval}
                  onChange={handleFormChange}
                  inputProps={{ min: 1 }}
                  margin="normal"
                  helperText={formData.frequency === 'egyedi' ? 'Napok száma' : 'Időszakok száma'}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Fizetési határidő (nap)"
                  name="paymentTerms"
                  type="number"
                  value={formData.paymentTerms}
                  onChange={handleFormChange}
                  inputProps={{ min: 1 }}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Kezdő dátum"
                  value={formData.startDate}
                  onChange={(newValue) => handleDateChange('startDate', newValue)}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Végdátum (opcionális)"
                  value={formData.endDate}
                  onChange={(newValue) => handleDateChange('endDate', newValue)}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Megjegyzések"
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  multiline
                  rows={2}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Számlázási tételek</Typography>
                
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Tétel neve"
                        name="name"
                        value={currentItem.name}
                        onChange={handleItemChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Leírás"
                        name="description"
                        value={currentItem.description}
                        onChange={handleItemChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Mennyiség"
                        name="quantity"
                        type="number"
                        value={currentItem.quantity}
                        onChange={handleItemChange}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Egységár"
                        name="unitPrice"
                        type="number"
                        value={currentItem.unitPrice}
                        onChange={handleItemChange}
                        InputProps={{
                          startAdornment: project?.financial.currency && (
                            <InputAdornment position="start">{project.financial.currency}</InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <Button 
                        variant="contained" 
                        onClick={addItem}
                        sx={{ height: '100%' }}
                      >
                        <AddIcon />
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
                
                {items.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tétel neve</TableCell>
                          <TableCell>Leírás</TableCell>
                          <TableCell align="right">Mennyiség</TableCell>
                          <TableCell align="right">Egységár</TableCell>
                          <TableCell align="right">Összesen</TableCell>
                          <TableCell align="right">Művelet</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">
                              {item.unitPrice.toLocaleString('hu-HU')} {project?.financial.currency}
                            </TableCell>
                            <TableCell align="right">
                              {(item.quantity * item.unitPrice).toLocaleString('hu-HU')} {project?.financial.currency}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => removeItem(item.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={4} align="right">
                            <Typography variant="subtitle1">Végösszeg:</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle1">
                              {items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString('hu-HU')} {project?.financial.currency}
                            </Typography>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper sx={{ p: 2, textAlign: 'center', mb: 2 }}>
                    <Typography variant="body2">Még nincsenek tételek hozzáadva</Typography>
                  </Paper>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Értesítések és automatizálás</Typography>
                
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <FormControl>
                    <InputLabel>Email értesítés</InputLabel>
                    <Select
                      name="emailNotification"
                      value={formData.emailNotification}
                      onChange={handleFormChange}
                      label="Email értesítés"
                    >
                      <MenuItem value={true}>Bekapcsolva</MenuItem>
                      <MenuItem value={false}>Kikapcsolva</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <InputLabel>Automatikus küldés</InputLabel>
                    <Select
                      name="autoSend"
                      value={formData.autoSend}
                      onChange={handleFormChange}
                      label="Automatikus küldés"
                    >
                      <MenuItem value={true}>Bekapcsolva</MenuItem>
                      <MenuItem value={false}>Kikapcsolva</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <InputLabel>PDF generálás</InputLabel>
                    <Select
                      name="generatePDF"
                      value={formData.generatePDF}
                      onChange={handleFormChange}
                      label="PDF generálás"
                    >
                      <MenuItem value={true}>Bekapcsolva</MenuItem>
                      <MenuItem value={false}>Kikapcsolva</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <InputLabel>Aktív állapot</InputLabel>
                    <Select
                      name="isActive"
                      value={formData.isActive}
                      onChange={handleFormChange}
                      label="Aktív állapot"
                    >
                      <MenuItem value={true}>Aktív</MenuItem>
                      <MenuItem value={false}>Inaktív</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>Mégsem</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={formData.name === '' || items.length === 0}
          >
            {isNewInvoice ? 'Létrehozás' : 'Mentés'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecurringInvoiceManager; 