import React, { useState, useEffect } from 'react';
import { Tabs, Tab } from '@mui/material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import { Save, Delete, Edit, Add, Refresh, Language } from '@mui/icons-material';

const contentPages = [
  { id: 'cookies', name: 'Cookies Policy' },
  { id: 'privacy', name: 'Privacy Policy' },
  { id: 'terms', name: 'Terms of Service' },
  { id: 'imprint', name: 'Imprint' }
];

const WebsiteContentManager = () => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('de');
  const [editorContent, setEditorContent] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/website-content', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setContents(data);
    } catch (error) {
      console.error('Error fetching website content:', error);
      showSnackbar('Failed to load website content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEdit = (content) => {
    setSelectedContent(content);
    
    // Initialize editor content from selected content or with default structure
    const initialContent = content?.content || {
      de: createDefaultContentStructure(),
      en: createDefaultContentStructure(),
      hu: createDefaultContentStructure()
    };
    
    setEditorContent(initialContent);
    setEditDialogOpen(true);
  };

  const createDefaultContentStructure = () => {
    // Default structure for each language content
    return {
      title: '',
      seo: {
        title: '',
        description: ''
      },
      general: {
        title: '',
        content: ''
      },
      // Common sections based on the pages
      sections: {}
    };
  };

  const handleCreateNew = (pageId) => {
    const pageDef = contentPages.find(p => p.id === pageId);
    if (!pageDef) return;

    const newContent = {
      page: pageId,
      content: {
        de: createDefaultContentStructure(),
        en: createDefaultContentStructure(),
        hu: createDefaultContentStructure()
      },
      active: true
    };

    setSelectedContent(newContent);
    setEditorContent(newContent.content);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const pageId = selectedContent.page;
      const contentToSave = {
        content: editorContent
      };

      const response = await fetch(`/api/website-content/${pageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(contentToSave)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const savedContent = await response.json();
      
      // Update content list
      setContents(prevContents => {
        const index = prevContents.findIndex(c => c.page === pageId);
        if (index >= 0) {
          return [
            ...prevContents.slice(0, index),
            savedContent,
            ...prevContents.slice(index + 1)
          ];
        } else {
          return [...prevContents, savedContent];
        }
      });

      setEditDialogOpen(false);
      showSnackbar('Content saved successfully', 'success');
    } catch (error) {
      console.error('Error saving content:', error);
      showSnackbar('Failed to save content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contentId) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/website-content/${contentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Remove deleted content from state
      setContents(prevContents => prevContents.filter(c => c.page !== contentId));
      showSnackbar('Content deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting content:', error);
      showSnackbar('Failed to delete content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (event) => {
    setCurrentLanguage(event.target.value);
  };

  const handleEditorChange = (field, value) => {
    setEditorContent(prev => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        [field]: value
      }
    }));
  };

  const handleNestedEditorChange = (section, field, value) => {
    setEditorContent(prev => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        [section]: {
          ...prev[currentLanguage][section],
          [field]: value
        }
      }
    }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getContentForPage = (pageId) => {
    return contents.find(c => c.page === pageId);
  };

  const getContentSections = () => {
    if (!selectedContent) return null;
    
    // Display different fields based on the page type
    const page = selectedContent.page;
    const currentContent = editorContent[currentLanguage] || {};
    
    return (
      <>
        <TextField
          label="Page Title"
          fullWidth
          margin="normal"
          value={currentContent.title || ''}
          onChange={(e) => handleEditorChange('title', e.target.value)}
        />
        
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>SEO Settings</Typography>
        <TextField
          label="SEO Title"
          fullWidth
          margin="normal"
          value={currentContent.seo?.title || ''}
          onChange={(e) => handleNestedEditorChange('seo', 'title', e.target.value)}
        />
        <TextField
          label="SEO Description"
          fullWidth
          multiline
          rows={2}
          margin="normal"
          value={currentContent.seo?.description || ''}
          onChange={(e) => handleNestedEditorChange('seo', 'description', e.target.value)}
        />
        
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>General Section</Typography>
        <TextField
          label="Section Title"
          fullWidth
          margin="normal"
          value={currentContent.general?.title || ''}
          onChange={(e) => handleNestedEditorChange('general', 'title', e.target.value)}
        />
        <TextField
          label="Section Content"
          fullWidth
          multiline
          rows={4}
          margin="normal"
          value={currentContent.general?.content || ''}
          onChange={(e) => handleNestedEditorChange('general', 'content', e.target.value)}
        />
        
        {/* Page specific sections */}
        {page === 'cookies' && (
          <>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Cookie Types</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.types?.title || ''}
              onChange={(e) => handleNestedEditorChange('types', 'title', e.target.value)}
            />
            <TextField
              label="Item 1"
              fullWidth
              margin="normal"
              value={currentContent.types?.item1 || ''}
              onChange={(e) => handleNestedEditorChange('types', 'item1', e.target.value)}
            />
            <TextField
              label="Item 2"
              fullWidth
              margin="normal"
              value={currentContent.types?.item2 || ''}
              onChange={(e) => handleNestedEditorChange('types', 'item2', e.target.value)}
            />
            <TextField
              label="Item 3"
              fullWidth
              margin="normal"
              value={currentContent.types?.item3 || ''}
              onChange={(e) => handleNestedEditorChange('types', 'item3', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Cookie Management</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.management?.title || ''}
              onChange={(e) => handleNestedEditorChange('management', 'title', e.target.value)}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={currentContent.management?.content || ''}
              onChange={(e) => handleNestedEditorChange('management', 'content', e.target.value)}
            />
          </>
        )}
        
        {page === 'privacy' && (
          <>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Data Collection</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.data?.title || ''}
              onChange={(e) => handleNestedEditorChange('data', 'title', e.target.value)}
            />
            <TextField
              label="Item 1"
              fullWidth
              margin="normal"
              value={currentContent.data?.item1 || ''}
              onChange={(e) => handleNestedEditorChange('data', 'item1', e.target.value)}
            />
            <TextField
              label="Item 2"
              fullWidth
              margin="normal"
              value={currentContent.data?.item2 || ''}
              onChange={(e) => handleNestedEditorChange('data', 'item2', e.target.value)}
            />
            <TextField
              label="Item 3"
              fullWidth
              margin="normal"
              value={currentContent.data?.item3 || ''}
              onChange={(e) => handleNestedEditorChange('data', 'item3', e.target.value)}
            />
            <TextField
              label="Item 4"
              fullWidth
              margin="normal"
              value={currentContent.data?.item4 || ''}
              onChange={(e) => handleNestedEditorChange('data', 'item4', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Cookies Section</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.cookies?.title || ''}
              onChange={(e) => handleNestedEditorChange('cookies', 'title', e.target.value)}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={currentContent.cookies?.content || ''}
              onChange={(e) => handleNestedEditorChange('cookies', 'content', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Your Rights</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.rights?.title || ''}
              onChange={(e) => handleNestedEditorChange('rights', 'title', e.target.value)}
            />
            <TextField
              label="Item 1"
              fullWidth
              margin="normal"
              value={currentContent.rights?.item1 || ''}
              onChange={(e) => handleNestedEditorChange('rights', 'item1', e.target.value)}
            />
            <TextField
              label="Item 2"
              fullWidth
              margin="normal"
              value={currentContent.rights?.item2 || ''}
              onChange={(e) => handleNestedEditorChange('rights', 'item2', e.target.value)}
            />
            <TextField
              label="Item 3"
              fullWidth
              margin="normal"
              value={currentContent.rights?.item3 || ''}
              onChange={(e) => handleNestedEditorChange('rights', 'item3', e.target.value)}
            />
            <TextField
              label="Item 4"
              fullWidth
              margin="normal"
              value={currentContent.rights?.item4 || ''}
              onChange={(e) => handleNestedEditorChange('rights', 'item4', e.target.value)}
            />
            <TextField
              label="Item 5"
              fullWidth
              margin="normal"
              value={currentContent.rights?.item5 || ''}
              onChange={(e) => handleNestedEditorChange('rights', 'item5', e.target.value)}
            />
          </>
        )}
        
        {page === 'terms' && (
          <>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Terms of Usage</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.usage?.title || ''}
              onChange={(e) => handleNestedEditorChange('usage', 'title', e.target.value)}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={currentContent.usage?.content || ''}
              onChange={(e) => handleNestedEditorChange('usage', 'content', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Liability</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.liability?.title || ''}
              onChange={(e) => handleNestedEditorChange('liability', 'title', e.target.value)}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={currentContent.liability?.content || ''}
              onChange={(e) => handleNestedEditorChange('liability', 'content', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Changes to Terms</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.changes?.title || ''}
              onChange={(e) => handleNestedEditorChange('changes', 'title', e.target.value)}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={currentContent.changes?.content || ''}
              onChange={(e) => handleNestedEditorChange('changes', 'content', e.target.value)}
            />
          </>
        )}
        
        {page === 'imprint' && (
          <>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Company Information</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.company?.title || ''}
              onChange={(e) => handleNestedEditorChange('company', 'title', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Registration Information</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.registration?.title || ''}
              onChange={(e) => handleNestedEditorChange('registration', 'title', e.target.value)}
            />
            <TextField
              label="VAT ID"
              fullWidth
              margin="normal"
              value={currentContent.registration?.vatId || ''}
              onChange={(e) => handleNestedEditorChange('registration', 'vatId', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Responsibility</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.responsibility?.title || ''}
              onChange={(e) => handleNestedEditorChange('responsibility', 'title', e.target.value)}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={currentContent.responsibility?.content || ''}
              onChange={(e) => handleNestedEditorChange('responsibility', 'content', e.target.value)}
            />
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Disclaimer</Typography>
            <TextField
              label="Section Title"
              fullWidth
              margin="normal"
              value={currentContent.disclaimer?.title || ''}
              onChange={(e) => handleNestedEditorChange('disclaimer', 'title', e.target.value)}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={currentContent.disclaimer?.content || ''}
              onChange={(e) => handleNestedEditorChange('disclaimer', 'content', e.target.value)}
            />
          </>
        )}
        
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Contact Information</Typography>
        <TextField
          label="Section Title"
          fullWidth
          margin="normal"
          value={currentContent.contact?.title || ''}
          onChange={(e) => handleNestedEditorChange('contact', 'title', e.target.value)}
        />
        <TextField
          label="Name Label"
          fullWidth
          margin="normal"
          value={currentContent.contact?.name || ''}
          onChange={(e) => handleNestedEditorChange('contact', 'name', e.target.value)}
        />
        <TextField
          label="Email Label"
          fullWidth
          margin="normal"
          value={currentContent.contact?.email || ''}
          onChange={(e) => handleNestedEditorChange('contact', 'email', e.target.value)}
        />
        
        {/* In imprint.jsx, there's also a phone field */}
        {page === 'imprint' && (
          <TextField
            label="Phone Label"
            fullWidth
            margin="normal"
            value={currentContent.contact?.phone || ''}
            onChange={(e) => handleNestedEditorChange('contact', 'phone', e.target.value)}
          />
        )}
      </>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Website Content Manager</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Refresh />}
          onClick={fetchContents}
        >
          Refresh
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
        {contentPages.map((page, index) => (
          <Tab key={page.id} label={page.name} id={`tab-${index}`} />
        ))}
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        contentPages.map((page, index) => (
          <div
            key={page.id}
            role="tabpanel"
            hidden={activeTab !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
          >
            {activeTab === index && (
              <Box sx={{ p: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5">{page.name}</Typography>
                      
                      {getContentForPage(page.id) ? (
                        <Box>
                          <IconButton 
                            color="primary"
                            onClick={() => handleEdit(getContentForPage(page.id))}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton 
                            color="error"
                            onClick={() => handleDelete(page.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      ) : (
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={() => handleCreateNew(page.id)}
                        >
                          Create Content
                        </Button>
                      )}
                    </Box>
                    
                    {getContentForPage(page.id) ? (
                      <Typography variant="body1">
                        Content available in {Object.keys(getContentForPage(page.id).content).join(', ')} languages.
                        Last updated: {new Date(getContentForPage(page.id).updatedAt).toLocaleString()}
                      </Typography>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        No content available for this page yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </div>
        ))
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedContent && selectedContent._id ? 'Edit Content' : 'Create New Content'}
            </Typography>
            <FormControl variant="outlined" sx={{ minWidth: 120 }}>
              <InputLabel id="language-select-label">Language</InputLabel>
              <Select
                labelId="language-select-label"
                value={currentLanguage}
                onChange={handleLanguageChange}
                label="Language"
                startAdornment={<Language sx={{ mr: 1 }} />}
              >
                <MenuItem value="de">Deutsch</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="hu">Magyar</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {getContentSections()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            color="primary" 
            variant="contained"
            startIcon={<Save />}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WebsiteContentManager;