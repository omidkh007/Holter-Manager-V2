import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
    Device, Cable, Patient, Appointment, Notification,
    HolterType, DeviceStatus, AppointmentStatus, AdditionalService, ADDITIONAL_SERVICES
} from './types';
import { INITIAL_RHYTHM_HOLTERS, INITIAL_PRESSURE_HOLTERS, INITIAL_CABLES, PUBLIC_HOLIDAYS } from './constants';
import { 
    DashboardIcon, CalendarIcon, InventoryIcon, ReportIcon, SettingsIcon, LogoutIcon, BellIcon, PlusIcon, TrashIcon, SearchIcon, PencilIcon, HandoverIcon
} from './components/icons';

// --- DEMO DATA ---
const today = new Date();
const yesterday = new Date(new Date().setDate(today.getDate() - 1));
const tomorrow = new Date(new Date().setDate(today.getDate() + 1));
const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2));
const threeDaysAgo = new Date(new Date().setDate(today.getDate() - 3));
const aWeekAgo = new Date(new Date().setDate(today.getDate() - 7));
const fiveDaysAgo = new Date(new Date().setDate(today.getDate() - 5));
const twoDaysFromNow = new Date(new Date().setDate(today.getDate() + 2));
const threeDaysFromNow = new Date(new Date().setDate(today.getDate() + 3));
const fiveDaysFromNow = new Date(new Date().setDate(today.getDate() + 5));
const todayAt10 = new Date(); todayAt10.setHours(10, 0, 0, 0);
const tomorrowAt10 = new Date(todayAt10); tomorrowAt10.setDate(tomorrowAt10.getDate() + 1);

const initialPatients: Patient[] = [
    { id: 'p1', name: 'علی رضایی', recordNumber: 'P001', mobilePhone: '09123456789', landlinePhone: '02188776655', age: 45 },
    { id: 'p2', name: 'سارا محمدی', recordNumber: 'P002', mobilePhone: '09121112233', landlinePhone: '02122334455', age: 32 },
    { id: 'p3', name: 'رضا احمدی', recordNumber: 'P003', mobilePhone: '09124445566', landlinePhone: '02155667788', age: 58 },
    { id: 'p4', name: 'مریم حسینی', recordNumber: 'P004', mobilePhone: '09127778899', landlinePhone: '02188990011', age: 29 },
    { id: 'p5', name: 'کیان صبوری', recordNumber: 'P005', mobilePhone: '09120001122', landlinePhone: '02133445566', age: 65 },
];

const initialAppointments: Appointment[] = [
    { id: 'app1', patientId: 'p1', holterId: 'HR-15', cableId: 'CBL-25', installDate: aWeekAgo, durationDays: 2, returnDate: fiveDaysAgo, status: AppointmentStatus.Completed, additionalServices: ['نوار قلب'] },
    { id: 'app2', patientId: 'p3', holterId: 'HR-1', cableId: 'CBL-1', installDate: threeDaysAgo, durationDays: 2, returnDate: yesterday, status: AppointmentStatus.Scheduled, additionalServices: ['اکو'] },
    { id: 'app3', patientId: 'p4', holterId: 'HP-1', cableId: 'CBL-2', installDate: twoDaysAgo, durationDays: 5, returnDate: threeDaysFromNow, status: AppointmentStatus.Scheduled, additionalServices: ['تست ورزش', 'آنالیز'] },
    { id: 'app4', patientId: 'p2', holterId: 'HR-2', cableId: 'CBL-3', installDate: todayAt10, durationDays: 1, returnDate: tomorrowAt10, status: AppointmentStatus.Scheduled, additionalServices: [] },
    { id: 'app5', patientId: 'p5', holterId: 'HR-3', cableId: 'CBL-4', installDate: twoDaysFromNow, durationDays: 3, returnDate: fiveDaysFromNow, status: AppointmentStatus.Scheduled, additionalServices: ['هولتر فشار'] },
];

const getInitialHolters = () => {
    const holters = [...INITIAL_RHYTHM_HOLTERS, ...INITIAL_PRESSURE_HOLTERS];
    const inUseHolterIds = initialAppointments.filter(app => app.status !== AppointmentStatus.Completed).map(app => app.holterId);
    return holters.map(holter => inUseHolterIds.includes(holter.id) ? { ...holter, status: DeviceStatus.InUse } : holter);
};

const getInitialCables = () => {
    const cables = [...INITIAL_CABLES];
    const inUseCableIds = initialAppointments.filter(app => app.status !== AppointmentStatus.Completed).map(app => app.cableId);
    return cables.map(cable => inUseCableIds.includes(cable.id) ? { ...cable, status: DeviceStatus.InUse } : cable);
};


// --- CONTEXT ---
interface AppContextType {
    isLoggedIn: boolean;
    login: (user: string, pass: string) => boolean;
    logout: () => void;
    holters: Device[];
    cables: Cable[];
    patients: Patient[];
    appointments: Appointment[];
    notifications: Notification[];
    blockedDates: string[];
    addHolter: (type: HolterType) => void;
    removeDevice: (id: string, isCable: boolean) => void;
    updateDeviceSerialNumber: (id: string, newSerialNumber: string, isCable: boolean) => void;
    addCable: () => void;
    addPatient: (patientData: Omit<Patient, 'id'>) => Patient;
    addAppointment: (newApp: Omit<Appointment, 'id' | 'returnDate'> & { returnTime?: string }) => void;
    updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
    releaseHolter: (appointmentId: string) => void;
    checkOverdueAppointments: () => void;
    addBlockedDate: (date: string) => void;
    removeBlockedDate: (date: string) => void;
    editAppointment: (updatedApp: Appointment) => void;
}

const AppContext = React.createContext<AppContextType | null>(null);

const useAppContext = () => {
    const context = React.useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [holters, setHolters] = useState<Device[]>(getInitialHolters());
    const [cables, setCables] = useState<Cable[]>(getInitialCables());
    const [patients, setPatients] = useState<Patient[]>(initialPatients);
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [blockedDates, setBlockedDates] = useState<string[]>(['2024-07-18', '2024-07-19']);

    const login = (user: string, pass: string) => {
        if (user === 'doctor' && pass === 'password') {
            setIsLoggedIn(true);
            return true;
        }
        return false;
    };

    const logout = () => setIsLoggedIn(false);

    const addHolter = useCallback((type: HolterType) => {
        setHolters(prev => {
            const newId = `H${type === HolterType.Rhythm ? 'R' : 'P'}-${prev.length + 1}`;
            const newSerialNumber = `${type === HolterType.Rhythm ? 'R' : 'P'}-0${prev.filter(h => h.type === type).length + 1}`;
            const newHolter: Device = { id: newId, type, serialNumber: newSerialNumber, status: DeviceStatus.Available };
            return [...prev, newHolter];
        });
    }, []);

    const removeDevice = useCallback((id: string, isCable: boolean) => {
        if (isCable) {
            setCables(prev => prev.filter(c => c.id !== id));
        } else {
            setHolters(prev => prev.filter(h => h.id !== id));
        }
    }, []);
    
    const updateDeviceSerialNumber = useCallback((id: string, newSerialNumber: string, isCable: boolean) => {
        if (isCable) {
            setCables(prev => prev.map(c => c.id === id ? { ...c, serialNumber: newSerialNumber } : c));
        } else {
            setHolters(prev => prev.map(h => h.id === id ? { ...h, serialNumber: newSerialNumber } : h));
        }
    }, []);

    const addCable = useCallback(() => {
        setCables(prev => {
            const newId = `CBL-${prev.length + 1}`;
            const newSerialNumber = `C-${prev.length + 1}`;
            const newCable: Cable = { id: newId, serialNumber: newSerialNumber, status: DeviceStatus.Available };
            return [...prev, newCable];
        });
    }, []);
    
    const addPatient = useCallback((patientData: Omit<Patient, 'id'>): Patient => {
        const newPatient: Patient = {
            ...patientData,
            id: `p${patients.length + 1}-${Date.now()}`
        };
        setPatients(prev => [...prev, newPatient]);
        return newPatient;
    }, [patients.length]);

    const addAppointment = useCallback((newApp: Omit<Appointment, 'id' | 'returnDate'> & { returnTime?: string }) => {
        const returnDate = new Date(newApp.installDate);
        returnDate.setDate(returnDate.getDate() + newApp.durationDays);
        
        if (newApp.returnTime) {
            const [hour, minute] = newApp.returnTime.split(':').map(Number);
            if (!isNaN(hour) && !isNaN(minute)) {
                returnDate.setHours(hour, minute, 0, 0);
            }
        }

        const appointment: Appointment = {
            ...newApp,
            id: `APP-${Date.now()}`,
            returnDate,
        };
        setAppointments(prev => [...prev, appointment]);

        setHolters(prev => prev.map(h => h.id === newApp.holterId ? { ...h, status: DeviceStatus.InUse } : h));
        setCables(prev => prev.map(c => c.id === newApp.cableId ? { ...c, status: DeviceStatus.InUse } : c));
    }, []);
    
    const editAppointment = useCallback((updatedApp: Appointment) => {
        setAppointments(prev => prev.map(app => app.id === updatedApp.id ? updatedApp : app));
    }, []);

    const updateAppointmentStatus = useCallback((id: string, status: AppointmentStatus) => {
        setAppointments(prev => prev.map(app => app.id === id ? { ...app, status } : app));
    }, []);

    const releaseHolter = useCallback((appointmentId: string) => {
        const app = appointments.find(a => a.id === appointmentId);
        if (!app) return;
        
        updateAppointmentStatus(appointmentId, AppointmentStatus.Completed);
        
        setHolters(prev => prev.map(h => h.id === app.holterId ? { ...h, status: DeviceStatus.Available } : h));
        // FIX: Changed Device.Available to DeviceStatus.Available as 'Device' is a type and not an enum.
        setCables(prev => prev.map(c => c.id === app.cableId ? { ...c, status: DeviceStatus.Available } : c));
    }, [appointments, updateAppointmentStatus]);

    const checkOverdueAppointments = useCallback(() => {
        const now = new Date();
        appointments.forEach(app => {
            if (app.status === AppointmentStatus.Scheduled && now > app.returnDate) {
                const alreadyNotified = notifications.some(n => n.appointmentId === app.id);
                if (!alreadyNotified) {
                    const patient = patients.find(p => p.id === app.patientId);
                    
                    const newNotification: Notification = {
                        id: `N-${Date.now()}`,
                        appointmentId: app.id,
                        createdAt: new Date(),
                        message: `موعد تحویل بیمار ${patient?.name} گذشته است. لطفا برای پیگیری تحویل هولتر تماس بگیرید.`,
                    };
                    setNotifications(prev => [newNotification, ...prev]);
                    updateAppointmentStatus(app.id, AppointmentStatus.Overdue);
                }
            }
        });
    }, [appointments, notifications, patients, updateAppointmentStatus]);


    const addBlockedDate = useCallback((date: string) => setBlockedDates(prev => [...prev, date]), []);
    const removeBlockedDate = useCallback((date: string) => setBlockedDates(prev => prev.filter(d => d !== date)), []);

    useEffect(() => {
       checkOverdueAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const contextValue = useMemo(() => ({
        isLoggedIn, login, logout, holters, cables, patients, appointments, notifications,
        addHolter, removeDevice, addCable, addPatient, addAppointment, updateAppointmentStatus, releaseHolter,
        checkOverdueAppointments, blockedDates, addBlockedDate, removeBlockedDate, editAppointment, updateDeviceSerialNumber
    }), [isLoggedIn, holters, cables, patients, appointments, notifications, blockedDates, checkOverdueAppointments, addHolter, removeDevice, addCable, addPatient, addAppointment, updateAppointmentStatus, releaseHolter, addBlockedDate, removeBlockedDate, editAppointment, updateDeviceSerialNumber]);

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// --- CUSTOM COMPONENTS ---
const SearchableSelect: React.FC<{
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}> = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setSearchTerm('');
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                 <input
                    type="text"
                    placeholder={!isOpen && selectedOption ? selectedOption.label : placeholder}
                    value={searchTerm}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        if(value) onChange(''); // Clear selection when user starts typing
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full p-2 pr-10 border rounded-md text-gray-900 bg-white"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                     <SearchIcon />
                </div>
            </div>
            {isOpen && (
                <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <li
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
                            >
                                {option.label}
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 text-gray-500">موردی یافت نشد.</li>
                    )}
                </ul>
            )}
        </div>
    );
};

// --- LAYOUT COMPONENTS ---
const Sidebar: React.FC = () => {
    const location = useLocation();
    const navItems = [
        { path: '/', label: 'داشبورد', icon: <DashboardIcon /> },
        { path: '/appointments', label: 'نوبت‌دهی', icon: <CalendarIcon /> },
        { path: '/inventory', label: 'موجودی دستگاه', icon: <InventoryIcon /> },
        { path: '/handover', label: 'تحویل', icon: <HandoverIcon /> },
        { path: '/reports', label: 'گزارشات', icon: <ReportIcon /> },
        { path: '/settings', label: 'تنظیمات', icon: <SettingsIcon /> },
    ];
    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col h-screen">
            <div className="p-5 text-2xl font-bold border-b border-gray-700">مدیریت هولتر</div>
            <nav className="flex-grow mt-5">
                {navItems.map(item => (
                    <Link key={item.path} to={item.path} className={`flex items-center px-5 py-3 transition-colors duration-200 ${location.pathname === item.path ? 'bg-gray-900' : 'hover:bg-gray-700'}`}>
                        {item.icon}
                        <span className="mr-3">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}

const Header: React.FC = () => {
    const { logout } = useAppContext();
    const { notifications } = useAppContext();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">به سیستم مدیریت هولتر خوش آمدید</h1>
            <div className="flex items-center space-x-reverse space-x-4">
                <div className="relative">
                    <BellIcon />
                    {notifications.length > 0 && 
                        <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifications.length}</span>
                    }
                </div>
                <button onClick={handleLogout} className="flex items-center text-gray-800 hover:text-red-500 transition-colors">
                    <LogoutIcon />
                    <span className="mr-2">خروج</span>
                </button>
            </div>
        </header>
    );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoggedIn } = useAppContext();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, navigate]);

    return isLoggedIn ? <>{children}</> : null;
};

const MainLayout: React.FC = () => (
    <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
            <Header />
            <main className="p-6 bg-gray-100 flex-grow">
                <Outlet />
            </main>
        </div>
    </div>
);

// --- PAGES ---

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAppContext();
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (login(username, password)) {
            navigate('/');
        } else {
            setError('نام کاربری یا رمز عبور اشتباه است.');
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-200">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">ورود به سیستم</h2>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-900 text-sm font-bold mb-2" htmlFor="username">نام کاربری</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 bg-white text-gray-900 leading-tight focus:outline-none focus:shadow-outline placeholder:text-gray-400"
                            placeholder="doctor"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-900 text-sm font-bold mb-2" htmlFor="password">رمز عبور</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 bg-white text-gray-900 mb-3 leading-tight focus:outline-none focus:shadow-outline placeholder:text-gray-400"
                            placeholder="password"
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                            ورود
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { appointments, holters, cables, patients, notifications, checkOverdueAppointments } = useAppContext();
    
    useEffect(() => {
        const intervalId = setInterval(checkOverdueAppointments, 60000); // Check every minute
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const todayInstallations = appointments.filter(app => new Date(app.installDate).toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA'));
    const todayReturns = appointments.filter(app => new Date(app.returnDate).toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA'));

    const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'ناشناس';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800">هولترهای موجود</h3>
                    <p className="text-3xl font-bold text-green-500 mt-2">{holters.filter(h => h.status === DeviceStatus.Available).length}</p>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800">کابل‌های موجود</h3>
                    <p className="text-3xl font-bold text-blue-500 mt-2">{cables.filter(c => c.status === DeviceStatus.Available).length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800">نوبت‌های فعال</h3>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{appointments.filter(a => a.status === AppointmentStatus.Active || a.status === AppointmentStatus.Scheduled).length}</p>
                </div>
            </div>

            {notifications.length > 0 && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow" role="alert">
                    <p className="font-bold">هشدارها</p>
                    <ul className="mt-2 list-disc list-inside">
                        {notifications.map(n => <li key={n.id}>{n.message}</li>)}
                    </ul>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-900 mb-4">نصب‌های امروز ({new Date().toLocaleDateString('fa-IR')})</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {todayInstallations.length > 0 ? todayInstallations.map(app => (
                            <div key={app.id} className="p-3 bg-gray-50 rounded border">
                                <p className="font-medium text-gray-900">{getPatientName(app.patientId)}</p>
                                <p className="text-sm text-gray-700">ساعت: {new Date(app.installDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        )) : <p className="text-gray-700">هیچ نصبی برای امروز ثبت نشده است.</p>}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-900 mb-4">تحویل‌های امروز ({new Date().toLocaleDateString('fa-IR')})</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                         {todayReturns.length > 0 ? todayReturns.map(app => (
                            <div key={app.id} className="p-3 bg-gray-50 rounded border">
                                <p className="font-medium text-gray-900">{getPatientName(app.patientId)}</p>
                                <p className="text-sm text-gray-700">موعد تحویل: {new Date(app.returnDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        )) : <p className="text-gray-700">هیچ تحویلی برای امروز ثبت نشده است.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AppointmentsPage: React.FC = () => {
    const { patients, holters, cables, appointments, addAppointment, addPatient, blockedDates } = useAppContext();
    const [isNewPatient, setIsNewPatient] = useState(false);
    const [calculatedReturnDate, setCalculatedReturnDate] = useState<Date | null>(null);
    const [dateError, setDateError] = useState('');

    const [newPatientData, setNewPatientData] = useState({
        name: '', recordNumber: '', mobilePhone: '', landlinePhone: '', age: ''
    });
    const [formData, setFormData] = useState({
        patientId: '', holterId: '', cableId: '', installDate: '',
        installTime: '', returnTime: '', durationDays: '1', additionalServices: [] as AdditionalService[]
    });

    useEffect(() => {
        if (formData.installDate && blockedDates.includes(formData.installDate)) {
            setDateError('پزشک در این تاریخ در دسترس نیست. لطفا با پزشک تماس بگیرید.');
        } else {
            setDateError('');
        }
    }, [formData.installDate, blockedDates]);

    useEffect(() => {
        if (!isNewPatient && formData.installTime) {
            setFormData(prev => ({ ...prev, returnTime: prev.installTime }));
        }
    }, [formData.installTime, isNewPatient]);
    
     useEffect(() => {
        if (formData.installDate && formData.durationDays) {
            const install = new Date(formData.installDate);
            if (formData.installTime) {
                const [h, m] = formData.installTime.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) install.setHours(h, m);
            }
            const duration = parseInt(formData.durationDays);
            const returnDate = new Date(install);
            returnDate.setDate(install.getDate() + duration);

            if (formData.returnTime) {
                const [h, m] = formData.returnTime.split(':').map(Number);
                 if (!isNaN(h) && !isNaN(m)) returnDate.setHours(h, m);
            }
            setCalculatedReturnDate(returnDate);
        } else {
            setCalculatedReturnDate(null);
        }
    }, [formData.installDate, formData.installTime, formData.durationDays, formData.returnTime]);

    const availableHolters = useMemo(() => {
        if (!formData.installDate || !formData.durationDays) return [];

        const newAppStart = new Date(formData.installDate);
        if(formData.installTime) {
            const [h, m] = formData.installTime.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) newAppStart.setHours(h, m);
        }
        const newAppEnd = new Date(newAppStart);
        newAppEnd.setDate(newAppEnd.getDate() + parseInt(formData.durationDays));

        return holters.filter(holter => {
            const conflictingAppointment = appointments.find(app => 
                app.holterId === holter.id &&
                app.status !== AppointmentStatus.Completed &&
                app.status !== AppointmentStatus.Returned &&
                (new Date(app.installDate) < newAppEnd) && (new Date(app.returnDate) > newAppStart)
            );
            return !conflictingAppointment;
        });
    }, [holters, appointments, formData.installDate, formData.installTime, formData.durationDays]);

    const availableCables = useMemo(() => {
        if (!formData.installDate || !formData.durationDays) return [];

        const newAppStart = new Date(formData.installDate);
        if(formData.installTime) {
            const [h, m] = formData.installTime.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) newAppStart.setHours(h, m);
        }
        const newAppEnd = new Date(newAppStart);
        newAppEnd.setDate(newAppEnd.getDate() + parseInt(formData.durationDays));

        return cables.filter(cable => {
            const conflictingAppointment = appointments.find(app => 
                app.cableId === cable.id &&
                app.status !== AppointmentStatus.Completed &&
                app.status !== AppointmentStatus.Returned &&
                (new Date(app.installDate) < newAppEnd) && (new Date(app.returnDate) > newAppStart)
            );
            return !conflictingAppointment;
        });
    }, [cables, appointments, formData.installDate, formData.installTime, formData.durationDays]);

    const handleServiceChange = (service: AdditionalService) => {
        setFormData(prev => ({
            ...prev,
            additionalServices: prev.additionalServices.includes(service)
                ? prev.additionalServices.filter(s => s !== service)
                : [...prev.additionalServices, service]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (dateError) {
             alert(dateError);
             return;
        }

        let finalPatientId = formData.patientId;
        if (isNewPatient) {
            if (!newPatientData.name || !newPatientData.recordNumber || !newPatientData.mobilePhone) {
                alert('لطفا اطلاعات بیمار جدید را کامل کنید (نام، شماره پرونده، موبایل).'); return;
            }
            const newPatient = addPatient({ ...newPatientData, age: newPatientData.age ? parseInt(newPatientData.age) : undefined });
            finalPatientId = newPatient.id;
        }

        if (!finalPatientId) { alert('لطفا یک بیمار را انتخاب کنید یا بیمار جدیدی ثبت کنید.'); return; }
        if (!formData.holterId || !formData.cableId) { alert('لطفا هولتر و کابل را انتخاب کنید.'); return; }

        const [year, month, day] = formData.installDate.split('-').map(Number);
        const [hour, minute] = formData.installTime.split(':').map(Number);
        const installDateTime = new Date(year, month - 1, day, hour, minute);

        addAppointment({
            patientId: finalPatientId, holterId: formData.holterId, cableId: formData.cableId,
            installDate: installDateTime, durationDays: parseInt(formData.durationDays),
            status: AppointmentStatus.Scheduled, additionalServices: formData.additionalServices,
            returnTime: formData.returnTime,
        });
        alert('نوبت با موفقیت ثبت شد.');
        // Reset forms
        setFormData({ patientId: '', holterId: '', cableId: '', installDate: '', installTime: '', returnTime: '', durationDays: '1', additionalServices: [] });
        setNewPatientData({ name: '', recordNumber: '', mobilePhone: '', landlinePhone: '', age: '' });
        setIsNewPatient(false);
    };
    
    return (
         <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ثبت نوبت جدید</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-center mb-4">
                        <input id="new-patient-checkbox" type="checkbox" checked={isNewPatient} onChange={(e) => setIsNewPatient(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                        <label htmlFor="new-patient-checkbox" className="mr-2 block text-sm font-medium text-gray-900">بیمار جدید</label>
                    </div>

                    {isNewPatient ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-gray-900">نام و نام خانوادگی</label>
                                <input type="text" value={newPatientData.name} onChange={e => setNewPatientData({...newPatientData, name: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-gray-900">شماره پرونده</label>
                                <input type="text" value={newPatientData.recordNumber} onChange={e => setNewPatientData({...newPatientData, recordNumber: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-gray-900">شماره موبایل</label>
                                <input type="tel" value={newPatientData.mobilePhone} onChange={e => setNewPatientData({...newPatientData, mobilePhone: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                             <div>
                                <label className="block text-gray-900">تلفن ثابت</label>
                                <input type="tel" value={newPatientData.landlinePhone} onChange={e => setNewPatientData({...newPatientData, landlinePhone: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-gray-900">سن</label>
                                <input type="number" value={newPatientData.age} onChange={e => setNewPatientData({...newPatientData, age: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-gray-900 mb-1">انتخاب بیمار</label>
                             <SearchableSelect
                                options={patients.map(p => ({ value: p.id, label: `${p.name} - ${p.recordNumber}` }))}
                                value={formData.patientId}
                                onChange={val => setFormData({ ...formData, patientId: val })}
                                placeholder="جستجوی نام یا شماره پرونده بیمار..."
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    <div>
                        <label className="block text-gray-900">تاریخ نصب</label>
                        <input type="date" value={formData.installDate} onChange={e => setFormData({...formData, installDate: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                         {formData.installDate && !dateError && <span className="text-xs text-gray-600 mt-1 block">{new Date(formData.installDate).toLocaleDateString('fa-IR', { dateStyle: 'full' })}</span>}
                         {dateError && <p className="text-sm text-red-600 mt-2">{dateError}</p>}
                    </div>
                    <div>
                        <label className="block text-gray-900">ساعت نصب</label>
                        <input type="time" value={formData.installTime} onChange={e => setFormData({...formData, installTime: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-gray-900">مدت زمان نصب (روز)</label>
                        <select value={formData.durationDays} onChange={e => setFormData({...formData, durationDays: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        {Array.from({length: 7}, (_, i) => i + 1).map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-gray-900">ساعت تحویل</label>
                        <input type="time" value={formData.returnTime} onChange={e => setFormData({...formData, returnTime: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-gray-900">شماره هولتر</label>
                        <select value={formData.holterId} onChange={e => setFormData({...formData, holterId: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={!formData.installDate}>
                            <option value="">انتخاب کنید</option>
                            {availableHolters.map(h => <option key={h.id} value={h.id}>{h.serialNumber} ({h.type})</option>)}
                        </select>
                        {!formData.installDate && <p className="text-xs text-red-500 mt-1">ابتدا تاریخ نصب را انتخاب کنید.</p>}
                    </div>
                    <div>
                        <label className="block text-gray-900">شماره کابل</label>
                        <select value={formData.cableId} onChange={e => setFormData({...formData, cableId: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={!formData.installDate}>
                            <option value="">انتخاب کنید</option>
                            {availableCables.map(c => <option key={c.id} value={c.id}>{c.serialNumber}</option>)}
                        </select>
                    </div>
                </div>

                {calculatedReturnDate && (
                    <div className="p-3 bg-blue-50 border-r-4 border-blue-500 rounded-md">
                        <p className="font-semibold text-blue-800">
                            تاریخ و ساعت تحویل: {calculatedReturnDate.toLocaleString('fa-IR', { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                    </div>
                )}
                
                <div>
                    <label className="block text-gray-900 mb-2">خدمات همراه</label>
                    <div className="flex flex-wrap gap-4">
                        {ADDITIONAL_SERVICES.map(service => (
                             <label key={service} className="flex items-center space-x-2 space-x-reverse">
                                <input type="checkbox" checked={formData.additionalServices.includes(service)} onChange={() => handleServiceChange(service)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-gray-900">{service}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="pt-5 text-left">
                    <button type="submit" disabled={!!dateError} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        ثبت نوبت
                    </button>
                </div>
            </form>
        </div>
    );
};

const InventoryPage: React.FC = () => {
    const { holters, cables, addHolter, addCable, removeDevice, updateDeviceSerialNumber } = useAppContext();
    const [editingState, setEditingState] = useState<{ id: string, serialNumber: string } | null>(null);
    
    const rhythmHolters = holters.filter(h => h.type === HolterType.Rhythm);
    const pressureHolters = holters.filter(h => h.type === HolterType.Pressure);
    
    const handleSave = (id: string, isCable: boolean) => {
        if (!editingState || editingState.serialNumber.trim() === '') {
            alert('نام/شماره سریال نمی‌تواند خالی باشد.');
            return;
        }
        updateDeviceSerialNumber(id, editingState.serialNumber, isCable);
        setEditingState(null);
    };

    const renderDeviceList = <T extends {id: string, serialNumber: string, status: DeviceStatus}>(title: string, devices: T[], isCable: boolean, onAdd?: () => void) => (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">{title} ({devices.length})</h3>
                {onAdd && <button onClick={onAdd} className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600"><PlusIcon /></button>}
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
                {devices.map(device => (
                    <div key={device.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                        {editingState && editingState.id === device.id ? (
                            <>
                                <input
                                    type="text"
                                    value={editingState.serialNumber}
                                    onChange={(e) => setEditingState({ ...editingState, serialNumber: e.target.value })}
                                    className="flex-grow p-1 border rounded-md text-gray-900 bg-white mr-2"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave(device.id, isCable)}
                                />
                                <div className="flex items-center space-x-2 space-x-reverse flex-shrink-0">
                                    <button onClick={() => handleSave(device.id, isCable)} className="text-green-600 hover:text-green-800">ذخیره</button>
                                    <button onClick={() => setEditingState(null)} className="text-gray-600 hover:text-gray-800">لغو</button>
                                </div>
                            </>
                        ) : (
                             <>
                                <span className="font-medium text-gray-900">{device.serialNumber}</span>
                                <div className="flex items-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${device.status === DeviceStatus.Available ? 'bg-green-100 text-green-800' :
                                        device.status === DeviceStatus.InUse ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                        {device.status}
                                    </span>
                                    <div className="flex items-center ml-4 space-x-2 space-x-reverse">
                                        <button onClick={() => setEditingState({ id: device.id, serialNumber: device.serialNumber })} className="text-indigo-600 hover:text-indigo-900"><PencilIcon /></button>
                                        <button onClick={() => removeDevice(device.id, isCable)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderDeviceList('هولترهای ریتم', rhythmHolters, false, () => addHolter(HolterType.Rhythm))}
            {renderDeviceList('هولترهای فشار', pressureHolters, false, () => addHolter(HolterType.Pressure))}
            {renderDeviceList('کابل‌ها', cables, true, addCable)}
        </div>
    );
};

const HandoverPage: React.FC = () => {
    const { appointments, patients, holters, cables, releaseHolter } = useAppContext();

    const activeAppointments = appointments
        .filter(app => app.status !== AppointmentStatus.Completed)
        .sort((a, b) => new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime());

    const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'ناشناس';
    const getHolterSerial = (id: string) => holters.find(h => h.id === id)?.serialNumber || 'N/A';
    const getCableSerial = (id: string) => cables.find(c => c.id === id)?.serialNumber || 'N/A';

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">تحویل و آزاد سازی دستگاه‌ها</h2>
            <p className="text-gray-600 mb-2">در این بخش لیست تمام دستگاه‌هایی که به بیماران تحویل داده شده و هنوز آزاد نشده‌اند را مشاهده می‌کنید.</p>
            <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-md mb-6">لیست زیر بر اساس نزدیک‌ترین تاریخ تحویل مرتب شده است تا برنامه‌ریزی برای نوبت‌های جدید آسان‌تر باشد.</p>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">بیمار</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">هولتر / کابل</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">موعد تحویل</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">وضعیت</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">عملیات</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {activeAppointments.length > 0 ? activeAppointments.map(app => (
                            <tr key={app.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{getPatientName(app.patientId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{getHolterSerial(app.holterId)} / {getCableSerial(app.cableId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(app.returnDate).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${app.status === AppointmentStatus.Overdue ? 'bg-red-100 text-red-800' :
                                        app.status === AppointmentStatus.Returned ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {app.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button 
                                        onClick={() => releaseHolter(app.id)} 
                                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                        disabled={app.status === AppointmentStatus.Completed}
                                    >
                                        آزاد سازی دستگاه
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-4 text-gray-500">هیچ دستگاهی در حال استفاده نیست.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Helper function to convert a blob to a Base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to convert blob to base64'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


const ReportsPage: React.FC = () => {
    const { appointments, patients, holters, cables, releaseHolter, updateAppointmentStatus, editAppointment } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

    const getPatientInfo = (id: string) => patients.find(p => p.id === id) || { name: 'حذف شده', recordNumber: 'N/A' };
    
    const filteredAppointments = appointments.filter(app => {
        const patient = getPatientInfo(app.patientId);
        return patient.name.includes(searchTerm) || patient.recordNumber.includes(searchTerm);
    });
    
    const handleEditSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(editingAppointment) {
            editAppointment(editingAppointment);
            setEditingAppointment(null);
            alert("نوبت با موفقیت ویرایش شد.");
        }
    };

    const handlePdfExport = async () => {
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        // @ts-ignore
        if (!jsPDF || !jsPDF.API.autoTable) {
            alert("کتابخانه ساخت PDF بارگذاری نشده است.");
            return;
        }

        try {
            const fontUrl = 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn-font@33.0.3/fonts/TTF/Vazirmatn-Regular.ttf';
            const fontResponse = await fetch(fontUrl);
            if (!fontResponse.ok) throw new Error('فایل فونت قابل دانلود نیست.');
            
            const fontBlob = await fontResponse.blob();
            const fontAsBase64 = await blobToBase64(fontBlob);
            
            const doc = new jsPDF();
            
            doc.addFileToVFS('Vazirmatn-Regular.ttf', fontAsBase64);
            doc.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'normal');
            doc.setFont('Vazirmatn');

            const title = "گزارش کلی نوبت‌ها";
            const textWidth = doc.getTextWidth(title);
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(title, pageWidth - textWidth - 14, 15);

            const head = [['بیمار', 'تاریخ نصب', 'تاریخ تحویل', 'هولتر/کابل', 'وضعیت', 'خدمات همراه']];

            const body = filteredAppointments.map(app => {
                const patient = getPatientInfo(app.patientId);
                const holter = holters.find(h => h.id === app.holterId)?.serialNumber || 'N/A';
                const cable = cables.find(c => c.id === app.cableId)?.serialNumber || 'N/A';
                return [
                    `${patient.name} (${patient.recordNumber})`,
                    new Date(app.installDate).toLocaleString('fa-IR', {dateStyle: 'short', timeStyle: 'short'}),
                    new Date(app.returnDate).toLocaleString('fa-IR', {dateStyle: 'short', timeStyle: 'short'}),
                    `${holter} / ${cable}`,
                    app.status,
                    app.additionalServices.join('، ') || '-',
                ];
            });
            
            // @ts-ignore
            doc.autoTable({
                head: head,
                body: body,
                startY: 20,
                styles: { font: 'Vazirmatn', halign: 'right' },
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
                theme: 'grid',
            });

            doc.save('Holter-Report.pdf');

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert('خطا در تولید فایل PDF. لطفا اتصال اینترنت خود را بررسی کنید.');
        }
    };

    const handleCsvExport = () => {
        const head = ['بیمار', 'شماره پرونده', 'تاریخ نصب', 'تاریخ تحویل', 'هولتر', 'کابل', 'وضعیت', 'خدمات همراه'];
        
        const body = filteredAppointments.map(app => {
            const patient = getPatientInfo(app.patientId);
            const holter = holters.find(h => h.id === app.holterId)?.serialNumber || 'N/A';
            const cable = cables.find(c => c.id === app.cableId)?.serialNumber || 'N/A';
            return [
                patient.name, patient.recordNumber,
                new Date(app.installDate).toISOString(),
                new Date(app.returnDate).toISOString(),
                holter, cable, app.status,
                `"${app.additionalServices.join(', ')}"`,
            ];
        });

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF" // BOM for Excel
            + head.join(',') + '\n'
            + body.map(e => e.join(',')).join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "holter-report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const EditModal = () => {
        
        const handleServiceChange = (service: AdditionalService) => {
            if (!editingAppointment) return;
            const currentServices = editingAppointment.additionalServices || [];
            const updatedServices = currentServices.includes(service)
                ? currentServices.filter(s => s !== service)
                : [...currentServices, service];
            setEditingAppointment({ ...editingAppointment, additionalServices: updatedServices });
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">ویرایش نوبت</h3>
                    {editingAppointment && (
                        <form onSubmit={handleEditSave}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-900">تاریخ نصب</label>
                                    <input 
                                        type="date" 
                                        value={new Date(editingAppointment.installDate).toISOString().split('T')[0]}
                                        onChange={(e) => setEditingAppointment({...editingAppointment, installDate: new Date(e.target.value)})}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-900">وضعیت</label>
                                    <select 
                                        value={editingAppointment.status} 
                                        onChange={(e) => setEditingAppointment({...editingAppointment, status: e.target.value as AppointmentStatus})}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    >
                                        {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <label className="block text-gray-900 font-medium mb-2">خدمات همراه</label>
                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                    {ADDITIONAL_SERVICES.map(service => (
                                        <label key={service} className="flex items-center space-x-2 space-x-reverse">
                                            <input
                                                type="checkbox"
                                                checked={editingAppointment.additionalServices.includes(service)}
                                                onChange={() => handleServiceChange(service)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-900 text-sm">{service}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                                <button type="button" onClick={() => setEditingAppointment(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">انصراف</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">ذخیره</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            {editingAppointment && <EditModal />}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">گزارش کلی نوبت‌ها</h2>
                <div>
                     <button onClick={handlePdfExport} className="bg-red-500 text-white px-4 py-2 rounded-md mr-2">خروجی PDF</button>
                     <button onClick={handleCsvExport} className="bg-green-500 text-white px-4 py-2 rounded-md">خروجی Excel</button>
                </div>
            </div>
            <input 
                type="text"
                placeholder="جستجو بر اساس نام یا شماره پرونده بیمار..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 mb-4 border rounded-md text-gray-900 bg-white"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">بیمار</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">تاریخ نصب</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">تاریخ تحویل</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">هولتر/کابل</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">وضعیت</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">خدمات همراه</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">عملیات</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAppointments.map(app => (
                            <tr key={app.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{getPatientInfo(app.patientId).name} ({getPatientInfo(app.patientId).recordNumber})</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(app.installDate).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(app.returnDate).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{holters.find(h=>h.id === app.holterId)?.serialNumber} / {cables.find(c=>c.id === app.cableId)?.serialNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{app.status}</td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">{app.additionalServices.join('، ') || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                     {app.status === AppointmentStatus.Returned && <button onClick={() => releaseHolter(app.id)} className="text-green-600 hover:text-green-900 ml-4">آزاد سازی</button>}
                                     {app.status === AppointmentStatus.Overdue && <button onClick={() => updateAppointmentStatus(app.id, AppointmentStatus.Returned)} className="text-blue-600 hover:text-blue-900 ml-4">اعلام تحویل</button>}
                                    <button onClick={() => setEditingAppointment(app)} className="text-indigo-600 hover:text-indigo-900">ویرایش</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SettingsPage: React.FC = () => {
    const { blockedDates, addBlockedDate, removeBlockedDate } = useAppContext();
    const [newBlockedDate, setNewBlockedDate] = useState('');

    const handleAddDate = () => {
        if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
            addBlockedDate(newBlockedDate);
            setNewBlockedDate('');
        }
    };
    
    // NOTE: This does not implement rescheduling existing appointments on blocked dates. A real app would need that logic.
    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">تنظیمات در دسترس نبودن پزشک</h2>
            <p className="text-gray-800 mb-4">در این بخش می‌توانید تاریخ‌هایی که در مطب حضور ندارید را مشخص کنید تا در تقویم نوبت‌دهی غیرفعال شوند.</p>
            <div className="flex items-center space-x-2 space-x-reverse mb-6">
                 <div className="flex-grow">
                    <input 
                        type="date"
                        value={newBlockedDate}
                        onChange={(e) => setNewBlockedDate(e.target.value)}
                        className="w-full p-2 border rounded-md text-gray-900"
                    />
                     {newBlockedDate && <span className="text-xs text-gray-600 mt-1 block">{new Date(newBlockedDate).toLocaleDateString('fa-IR', { dateStyle: 'full' })}</span>}
                </div>
                <button onClick={handleAddDate} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">افزودن تاریخ</button>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3">تاریخ‌های مسدود شده</h3>
            <div className="space-y-2">
                {blockedDates.map(date => (
                    <div key={date} className="flex justify-between items-center p-3 bg-gray-100 rounded-md">
                        <span className="text-gray-900">{new Date(date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <button onClick={() => removeBlockedDate(date)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN APP ---
const App: React.FC = () => {
    return (
        <AppProvider>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="appointments" element={<AppointmentsPage />} />
                        <Route path="inventory" element={<InventoryPage />} />
                        <Route path="handover" element={<HandoverPage />} />
                        <Route path="reports" element={<ReportsPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </HashRouter>
        </AppProvider>
    );
};

export default App;
