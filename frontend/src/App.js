import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

// Login Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await login(email, password);
    if (!success) {
      setError('Geçersiz e-posta veya şifre');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Hizmet Takip</h1>
          <p className="text-gray-600 mt-2">Yönetim Paneli</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="bilgi@gallaxdesign.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Dashboard Components
const Sidebar = ({ activeSection, setActiveSection }) => {
  const { logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'services', label: 'Hizmetler', icon: '🛠️' },
    { id: 'add-service', label: 'Hizmet Ekle', icon: '➕' }
  ];

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Hizmet Takip</h1>
        <p className="text-gray-400 text-sm">Yönetim Paneli</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeSection === item.id ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={logout}
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-700 text-red-400"
        >
          🚪 Çıkış Yap
        </button>
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <div className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">Hizmet Yönetimi</h2>
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString('tr-TR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ stats }) => {
  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold mb-6">Dashboard</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
          <h4 className="text-lg font-medium text-blue-800">Toplam Hizmet</h4>
          <p className="text-3xl font-bold text-blue-600">{stats.total_services}</p>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
          <h4 className="text-lg font-medium text-green-800">Aktif Hizmet</h4>
          <p className="text-3xl font-bold text-green-600">{stats.active_services}</p>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
          <h4 className="text-lg font-medium text-yellow-800">Yıllık Toplam</h4>
          <p className="text-3xl font-bold text-yellow-600">₺{stats.total_annual_fees?.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="text-lg font-medium mb-4">Hizmet Türleri</h4>
        <div className="space-y-2">
          {stats.services_by_type?.map(type => (
            <div key={type._id} className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">{type._id}</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {type.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ServiceList = ({ services, onEdit, onDelete }) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Hizmetler</h3>
        <span className="text-gray-600">{services.length} hizmet</span>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hizmet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sağlayıcı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yıllık Ücret</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sonraki Yenileme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map(service => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {service.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {service.service_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {service.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    ₺{service.annual_fee.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {service.next_renewal_date ? new Date(service.next_renewal_date).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {service.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => onEdit(service)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => onDelete(service.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ServiceForm = ({ service, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    service_type: service?.service_type || 'Domain',
    provider: service?.provider || '',
    creation_date: service?.creation_date || '',
    last_renewal_date: service?.last_renewal_date || '',
    next_renewal_date: service?.next_renewal_date || '',
    annual_fee: service?.annual_fee || 0,
    currency: service?.currency || 'TRY',
    status: service?.status || 'active',
    notes: service?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold mb-6">
        {service ? 'Hizmet Düzenle' : 'Yeni Hizmet Ekle'}
      </h3>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hizmet Adı
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hizmet Türü
              </label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Domain">Domain</option>
                <option value="Hosting">Hosting</option>
                <option value="Domain + Hosting">Domain + Hosting</option>
                <option value="Website">Website</option>
                <option value="Consulting">Danışmanlık</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sağlayıcı
              </label>
              <input
                type="text"
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yıllık Ücret
              </label>
              <input
                type="number"
                name="annual_fee"
                value={formData.annual_fee}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Oluşturma Tarihi
              </label>
              <input
                type="date"
                name="creation_date"
                value={formData.creation_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Son Yenileme Tarihi
              </label>
              <input
                type="date"
                name="last_renewal_date"
                value={formData.last_renewal_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sonraki Yenileme Tarihi
              </label>
              <input
                type="date"
                name="next_renewal_date"
                value={formData.next_renewal_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durum
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {service ? 'Güncelle' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Dashboard Component
const MainDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({});
  const [editingService, setEditingService] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`, axiosConfig);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/services/stats/dashboard`, axiosConfig);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchServices(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSaveService = async (serviceData) => {
    try {
      if (editingService) {
        await axios.put(`${API}/services/${editingService.id}`, serviceData, axiosConfig);
      } else {
        await axios.post(`${API}/services`, serviceData, axiosConfig);
      }
      
      await fetchServices();
      await fetchStats();
      setEditingService(null);
      setActiveSection('services');
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm('Bu hizmeti silmek istediğinizden emin misiniz?')) {
      try {
        await axios.delete(`${API}/services/${serviceId}`, axiosConfig);
        await fetchServices();
        await fetchStats();
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setActiveSection('add-service');
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setActiveSection('services');
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'dashboard' && <Dashboard stats={stats} />}
          {activeSection === 'services' && (
            <ServiceList 
              services={services} 
              onEdit={handleEditService}
              onDelete={handleDeleteService}
            />
          )}
          {activeSection === 'add-service' && (
            <ServiceForm 
              service={editingService}
              onSave={handleSaveService}
              onCancel={handleCancelEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? <MainDashboard /> : <Login />;
};

export default App;