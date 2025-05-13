import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    Paper,
    Alert,
    CircularProgress,
    SelectChangeEvent,
    ListSubheader
} from '@mui/material';
import { services } from '../../services/api';

const ServiceCreate = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        duration: 30,
        price: 0,
        category: ''
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await services.getCategories();
            setCategories(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to load service categories');
            setLoading(false);
        }
    };

    // Group categories by main category
    const groupedCategories = categories.reduce((groups, category) => {
        // Extract main category from value (e.g., 'beauty_hair' -> 'beauty')
        const mainCategory = category.value.split('_')[0];
        
        if (!groups[mainCategory]) {
            groups[mainCategory] = [];
        }
        
        groups[mainCategory].push(category);
        return groups;
    }, {});

    // Get display name for main category
    const getMainCategoryName = (key) => {
        switch(key) {
            case 'beauty': return 'Beauty';
            case 'cleaning': return 'Cleaning';
            case 'pet': return 'Pet Care';
            case 'car': return 'Car Care';
            case 'errands': return 'Errands';
            case 'handyman': return 'Handyman';
            default: return key.charAt(0).toUpperCase() + key.slice(1);
        }
    };

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' || name === 'duration' ? Number(value) : value
        }));
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await services.create(formData);
            navigate('/provider/dashboard');
        } catch (err) {
            console.error('Create service error');
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Failed to create service. Please try again.');
            }
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box maxWidth="md" mx="auto" mt={4}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Create New Service
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Service Category</InputLabel>
                        <Select
                            name="category"
                            value={formData.category || ''}
                            onChange={handleSelectChange}
                            label="Service Category"
                        >
                            {Object.keys(groupedCategories).map(mainCategory => [
                                // Add subheader for main category
                                <ListSubheader key={`header-${mainCategory}`}>
                                    {getMainCategoryName(mainCategory)}
                                </ListSubheader>,
                                // Add items for each subcategory
                                ...groupedCategories[mainCategory].map(category => (
                                    <MenuItem key={category.value} value={category.value}>
                                        {category.label}
                                    </MenuItem>
                                ))
                            ])}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Service Name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleTextChange}
                        margin="normal"
                        required
                    />

                    <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={formData.description || ''}
                        onChange={handleTextChange}
                        margin="normal"
                        multiline
                        rows={4}
                        required
                    />

                    <TextField
                        fullWidth
                        label="Duration (minutes)"
                        name="duration"
                        type="number"
                        value={formData.duration || 30}
                        onChange={handleTextChange}
                        margin="normal"
                        required
                        inputProps={{ min: 5, step: 5 }}
                    />

                    <TextField
                        fullWidth
                        label="Price"
                        name="price"
                        type="number"
                        value={formData.price || 0}
                        onChange={handleTextChange}
                        margin="normal"
                        required
                        InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                    />

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={submitting}
                        >
                            {submitting ? <CircularProgress size={24} /> : 'Create Service'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/provider/dashboard')}
                        >
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default ServiceCreate; 