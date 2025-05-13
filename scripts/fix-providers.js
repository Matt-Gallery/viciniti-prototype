const fs = require('fs');
const path = require('path');

// Fix the ServiceEdit.jsx file
const serviceEditPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'provider', 'ServiceEdit.jsx');
if (fs.existsSync(serviceEditPath)) {
  let content = fs.readFileSync(serviceEditPath, 'utf8');
  
  // Fix the useParams line
  content = content.replace(/const { id } = useParams<{ id }>\(\);/, 'const { id } = useParams();');
  
  fs.writeFileSync(serviceEditPath, content, 'utf8');
  console.log('Fixed ServiceEdit.jsx');
}

// Fix the ProviderDashboard.jsx file
const providerDashboardPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'provider', 'ProviderDashboard.jsx');
if (fs.existsSync(providerDashboardPath)) {
  let content = fs.readFileSync(providerDashboardPath, 'utf8');
  
  // Fix the handleAvailabilityChange line
  content = content.replace(/const handleAvailabilityChange = async \(availability, any\[\]>\) => {/, 'const handleAvailabilityChange = async (availability) => {');
  
  fs.writeFileSync(providerDashboardPath, content, 'utf8');
  console.log('Fixed ProviderDashboard.jsx');
}

// Fix the ProviderProfile.jsx file
const providerProfilePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'provider', 'ProviderProfile.jsx');
if (fs.existsSync(providerProfilePath)) {
  let content = fs.readFileSync(providerProfilePath, 'utf8');
  
  // Fix the object initialization
  content = content.replace(/email \|\| '',/, 'email: data.email || \'\',');
  content = content.replace(/phone_number \|\| '',/, 'phone_number: data.phone_number || \'\',');
  content = content.replace(/address \|\| '',/, 'address: data.address || \'\',');
  
  fs.writeFileSync(providerProfilePath, content, 'utf8');
  console.log('Fixed ProviderProfile.jsx');
}

// Fix the ProviderSetup.jsx file
const providerSetupPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'provider', 'ProviderSetup.jsx');
if (fs.existsSync(providerSetupPath)) {
  let content = fs.readFileSync(providerSetupPath, 'utf8');
  
  // Fix the handleTextChange line
  content = content.replace(/const handleTextChange = \(e \| HTMLTextAreaElement>\) => {/, 'const handleTextChange = (e) => {');
  
  fs.writeFileSync(providerSetupPath, content, 'utf8');
  console.log('Fixed ProviderSetup.jsx');
}

// Fix the ServiceCreate.jsx file
const serviceCreatePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'provider', 'ServiceCreate.jsx');
if (fs.existsSync(serviceCreatePath)) {
  let content = fs.readFileSync(serviceCreatePath, 'utf8');
  
  // Fix the reduce line
  content = content.replace(/const groupedCategories = categories\.reduce<Record<string, ServiceCategory\[\]>>\(/g, 'const groupedCategories = categories.reduce(');
  
  fs.writeFileSync(serviceCreatePath, content, 'utf8');
  console.log('Fixed ServiceCreate.jsx');
}

// Create empty types/index.js file for backward compatibility
const typesDir = path.join(__dirname, '..', 'frontend', 'src', 'types');
if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

const typesIndexPath = path.join(typesDir, 'index.js');
const typesContent = `// Empty types for backward compatibility
export const Service = {};
export const ServiceCategory = {};
export const TimeBlock = {};
export const AppointmentCreateRequest = {};
export const Appointment = {};
export const User = {};
export const AuthResponse = {};
export const ServiceProvider = {};
export const ServiceCreateRequest = {};
export const UserRegisterRequest = {};
export const ApiService = {};
export const ApiAppointment = {};
`;

fs.writeFileSync(typesIndexPath, typesContent, 'utf8');
console.log('Created empty types/index.js');

console.log('All fixes applied!'); 