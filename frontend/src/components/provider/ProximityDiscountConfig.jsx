import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    TextField, 
    Button, 
    Grid, 
    Switch,
    FormControlLabel,
    Divider,
    CircularProgress,
    Alert,
    Slider,
    Tooltip
} from '@mui/material';
import { providers } from '../../services/api';

// Function to format distance values
const formatDistanceValue = (value) => {
    if (value < 1500) {
        return `${value} yards`;
    } else {
        const miles = value / 1760;
        return `${miles.toFixed(1)} miles`;
    }
};

// Custom slider with tooltip showing the value
const ValueLabelComponent = (props) => {
    const { children, value } = props;
    
    // Format the distance value
    const formattedValue = formatDistanceValue(value);
    
    return (
        <Tooltip enterTouchDelay={0} placement="top" title={formattedValue}>
            {children}
        </Tooltip>
    );
};

const ProximityDiscountConfig = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Config state
    const [config, setConfig] = useState({
        is_active: true,
        tier_distances: {
            tier1: { max: 200 },
            tier2: { min: 200, max: 600 },
            tier3: { min: 600, max: 1760 },
            tier4: { min: 1760, max: 5280 }
        },
        discounts: {
            tier1: {
                '1appt': 15, '2appt': 20, '3appt': 25, '4appt': 30, '5appt': 35
            },
            tier2: {
                '1appt': 12, '2appt': 15, '3appt': 18, '4appt': 21, '5appt': 24
            },
            tier3: {
                '1appt': 10, '2appt': 11, '3appt': 12, '4appt': 13, '5appt': 14
            },
            tier4: {
                '1appt': 5, '2appt': 6, '3appt': 7, '4appt': 8, '5appt': 9
            }
        }
    });
    
    // Fetch configuration on component mount
    useEffect(() => {
        const fetchDiscountConfig = async () => {
            try {
                setLoading(true);
                const response = await providers.getDiscountConfig();
                setConfig(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching discount configuration:', err);
                setError('Failed to load discount configuration');
                setLoading(false);
            }
        };
        
        fetchDiscountConfig();
    }, []);
    
    // Handle saving configuration
    const handleSaveConfig = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            
            await providers.updateDiscountConfig(config);
            
            setSuccess('Discount configuration saved successfully');
            setSaving(false);
        } catch (err) {
            console.error('Error saving discount configuration:', err);
            setError('Failed to save discount configuration');
            setSaving(false);
        }
    };
    
    // Handle distance slider changes
    const handleDistanceChange = (tier, minOrMax, value) => {
        // Create a deep copy of tier distances to avoid modifying state directly
        const newTierDistances = { ...config.tier_distances };
        
        // Update the specific tier
        newTierDistances[tier] = {
            ...newTierDistances[tier],
            [minOrMax]: value
        };
        
        // Ensure logical consistency between tiers
        if (tier === 'tier1' && minOrMax === 'max') {
            // Tier 1 max should equal Tier 2 min
            newTierDistances.tier2.min = value;
        } else if (tier === 'tier2' && minOrMax === 'min') {
            // Tier 2 min should equal Tier 1 max
            newTierDistances.tier1.max = value;
        } else if (tier === 'tier2' && minOrMax === 'max') {
            // Tier 2 max should equal Tier 3 min
            newTierDistances.tier3.min = value;
        } else if (tier === 'tier3' && minOrMax === 'min') {
            // Tier 3 min should equal Tier 2 max
            newTierDistances.tier2.max = value;
        } else if (tier === 'tier3' && minOrMax === 'max') {
            // Tier 3 max should equal Tier 4 min
            newTierDistances.tier4.min = value;
        } else if (tier === 'tier4' && minOrMax === 'min') {
            // Tier 4 min should equal Tier 3 max
            newTierDistances.tier3.max = value;
        }
        
        // Update config with new tier distances
        setConfig({
            ...config,
            tier_distances: newTierDistances
        });
    };
    
    // Handle discount value changes
    const handleDiscountChange = (tier, apptCount, value) => {
        // Ensure value is a number between 0 and 100
        const numValue = parseInt(value, 10);
        const validValue = isNaN(numValue) ? 0 : Math.min(Math.max(numValue, 0), 100);
        
        setConfig({
            ...config,
            discounts: {
                ...config.discounts,
                [tier]: {
                    ...config.discounts[tier],
                    [apptCount]: validValue
                }
            }
        });
    };
    
    // Handle toggle for enabling/disabling discounts
    const handleToggleActive = (event) => {
        setConfig({
            ...config,
            is_active: event.target.checked
        });
    };
    
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }
    
    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2 }}>
            <Typography variant="h4" gutterBottom>Proximity Discount Configuration</Typography>
            
            <Box sx={{ mb: 2 }}>
                <FormControlLabel
                    control={
                        <Switch 
                            checked={config.is_active} 
                            onChange={handleToggleActive}
                            color="primary"
                        />
                    }
                    label="Enable proximity-based discounts"
                />
            </Box>
            
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}
            
            <Paper sx={{ p: 3, mb: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Discount Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Configure discount percentages based on proximity to existing appointments.
                        Adjust the distance tiers using the sliders, then set discount percentages for each tier.
                    </Typography>
                    
                    {/* Main content - integrated slider and inputs in each row */}
                    <Box sx={{ mb: 4, mt: 4 }}>
                        {/* Header row - appointment count labels */}
                        <Box sx={{ display: 'flex', mb: 3 }}>
                            {/* Space for tier label and slider */}
                            <Box sx={{ width: '40%' }}/>
                            
                            {/* Appointment count headers */}
                            <Box sx={{ display: 'flex', width: '60%' }}>
                                {[1, 2, 3, 4, 5].map((count) => (
                                    <Box key={`header-${count}`} sx={{ flex: 1, textAlign: 'center' }}>
                                        <Typography variant="subtitle2">+{count} Appt</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        
                        {/* Tier 1 Row - slider and inputs */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 5 }}>
                            {/* Left - Tier label and slider */}
                            <Box sx={{ width: '40%', display: 'flex', pr: 4 }}>
                                <Typography variant="subtitle2" sx={{ width: 60, flexShrink: 0 }}>
                                    Tier 1
                                </Typography>
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Slider
                                        value={config.tier_distances.tier1.max}
                                        min={50}
                                        max={1000}
                                        step={50}
                                        onChange={(e, value) => handleDistanceChange('tier1', 'max', value)}
                                        valueLabelDisplay="auto"
                                        components={{
                                            ValueLabel: ValueLabelComponent
                                        }}
                                        color="primary"
                                        sx={{ mb: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" align="center">
                                        0 to {formatDistanceValue(config.tier_distances.tier1.max)}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* Right - Tier 1 discount inputs */}
                            <Box sx={{ display: 'flex', width: '60%' }}>
                                {[1, 2, 3, 4, 5].map((count) => (
                                    <Box key={`tier1-${count}`} sx={{ flex: 1, px: 1, display: 'flex', justifyContent: 'center' }}>
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            InputProps={{
                                                endAdornment: <Typography variant="caption">%</Typography>,
                                                sx: { height: 36 }
                                            }}
                                            value={config.discounts.tier1[`${count}appt`]}
                                            onChange={(e) => handleDiscountChange('tier1', `${count}appt`, e.target.value)}
                                            sx={{ width: '80%' }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        
                        {/* Tier 2 Row - slider and inputs */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 5 }}>
                            {/* Left - Tier label and slider */}
                            <Box sx={{ width: '40%', display: 'flex', pr: 5 }}>
                                <Typography variant="subtitle2" sx={{ width: 60, flexShrink: 0 }}>
                                    Tier 2
                                </Typography>
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Slider
                                        value={[config.tier_distances.tier2.min, config.tier_distances.tier2.max]}
                                        min={50}
                                        max={1500}
                                        step={50}
                                        onChange={(e, value) => {
                                            handleDistanceChange('tier2', 'min', value[0]);
                                            handleDistanceChange('tier2', 'max', value[1]);
                                        }}
                                        valueLabelDisplay="auto"
                                        components={{
                                            ValueLabel: ValueLabelComponent
                                        }}
                                        color="primary"
                                        disableSwap
                                        sx={{ mb: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" align="center">
                                        {formatDistanceValue(config.tier_distances.tier2.min)} to {formatDistanceValue(config.tier_distances.tier2.max)}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* Right - Tier 2 discount inputs */}
                            <Box sx={{ display: 'flex', width: '60%' }}>
                                {[1, 2, 3, 4, 5].map((count) => (
                                    <Box key={`tier2-${count}`} sx={{ flex: 1, px: 1.5 }}>
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            InputProps={{
                                                endAdornment: <Typography variant="caption">%</Typography>,
                                                sx: { height: 36 }
                                            }}
                                            value={config.discounts.tier2[`${count}appt`]}
                                            onChange={(e) => handleDiscountChange('tier2', `${count}appt`, e.target.value)}
                                            sx={{ width: '80%' }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        
                        {/* Tier 3 Row - slider and inputs */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 5 }}>
                            {/* Left - Tier label and slider */}
                            <Box sx={{ width: '40%', display: 'flex', pr: 5 }}>
                                <Typography variant="subtitle2" sx={{ width: 60, flexShrink: 0 }}>
                                    Tier 3
                                </Typography>
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Slider
                                        value={[config.tier_distances.tier3.min, config.tier_distances.tier3.max]}
                                        min={600}
                                        max={2640}
                                        step={50}
                                        onChange={(e, value) => {
                                            handleDistanceChange('tier3', 'min', value[0]);
                                            handleDistanceChange('tier3', 'max', value[1]);
                                        }}
                                        valueLabelDisplay="auto"
                                        components={{
                                            ValueLabel: ValueLabelComponent
                                        }}
                                        color="primary"
                                        disableSwap
                                        sx={{ mb: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" align="center">
                                        {formatDistanceValue(config.tier_distances.tier3.min)} to {formatDistanceValue(config.tier_distances.tier3.max)}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* Right - Tier 3 discount inputs */}
                            <Box sx={{ display: 'flex', width: '60%' }}>
                                {[1, 2, 3, 4, 5].map((count) => (
                                    <Box key={`tier3-${count}`} sx={{ flex: 1, px: 1.5 }}>
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            InputProps={{
                                                endAdornment: <Typography variant="caption">%</Typography>,
                                                sx: { height: 36 }
                                            }}
                                            value={config.discounts.tier3[`${count}appt`]}
                                            onChange={(e) => handleDiscountChange('tier3', `${count}appt`, e.target.value)}
                                            sx={{ width: '80%' }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        
                        {/* Tier 4 Row - slider and inputs */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            {/* Left - Tier label and slider */}
                            <Box sx={{ width: '40%', display: 'flex', pr: 5 }}>
                                <Typography variant="subtitle2" sx={{ width: 60, flexShrink: 0 }}>
                                    Tier 4
                                </Typography>
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Slider
                                        value={[config.tier_distances.tier4.min, config.tier_distances.tier4.max]}
                                        min={1760}
                                        max={7040}
                                        step={176}
                                        onChange={(e, value) => {
                                            handleDistanceChange('tier4', 'min', value[0]);
                                            handleDistanceChange('tier4', 'max', value[1]);
                                        }}
                                        valueLabelDisplay="auto"
                                        components={{
                                            ValueLabel: ValueLabelComponent
                                        }}
                                        color="primary"
                                        disableSwap
                                        sx={{ mb: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" align="center">
                                        {formatDistanceValue(config.tier_distances.tier4.min)} to {formatDistanceValue(config.tier_distances.tier4.max)}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* Right - Tier 4 discount inputs */}
                            <Box sx={{ display: 'flex', width: '60%' }}>
                                {[1, 2, 3, 4, 5].map((count) => (
                                    <Box key={`tier4-${count}`} sx={{ flex: 1, px: 1.5 }}>
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            InputProps={{
                                                endAdornment: <Typography variant="caption">%</Typography>,
                                                sx: { height: 36 }
                                            }}
                                            value={config.discounts.tier4[`${count}appt`]}
                                            onChange={(e) => handleDiscountChange('tier4', `${count}appt`, e.target.value)}
                                            sx={{ width: '80%' }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                    
                    <Divider sx={{ my: 3 }} />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSaveConfig}
                        disabled={saving}
                    >
                        {saving ? <CircularProgress size={24} /> : 'Save Configuration'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default ProximityDiscountConfig; 