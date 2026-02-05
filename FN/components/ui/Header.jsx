'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MenuOutlined, BellFilled, FileTextOutlined, UserOutlined, PieChartOutlined, AppstoreOutlined, MinusCircleFilled, ClockCircleOutlined } from '@ant-design/icons';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/app/firebase';

const Header = () => {
    const router = useRouter();
    const pathname = usePathname(); // Get current URL path
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    // Derive activeMenu from pathname instead of manual state
    const activeMenu = pathname === '/monitor' ? 'monitor' : 'dashboard';
    const [showNewPatients, setShowNewPatients] = useState(false);
    const [newPatients, setNewPatients] = useState([]);
    
    // Modal State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [bedNo, setBedNo] = useState('');
    const [deviceNo, setDeviceNo] = useState('');
    const [error, setError] = useState('');

    // Alert State
    const [showAlerts, setShowAlerts] = useState(false);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
      const allPatientsRef = ref(db, 'Allpatients');
      const unsubscribe = onValue(allPatientsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const patientsArray = Object.keys(data).map(key => ({
            ...data[key],
            id: key
          }));
          const icuPatients = patientsArray.filter(patient => {
            const isICU = patient["Service Location"] === "ICU";
            const hasBed = patient["Bed no"] || patient["Room"];
            const hasDevice = patient["Assigned_Device_ID"] || patient["DeviceID"];
            return isICU && !(hasBed && hasDevice);
          });
          setNewPatients(icuPatients);
        } else {
          setNewPatients([]);
        }
      });
      return () => unsubscribe();
    }, []);

    // Alert Listener
    useEffect(() => {
        const patientsRef = ref(db, 'patient');
        const unsubscribe = onValue(patientsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const activeAlerts = [];
                Object.keys(data).forEach(hn => {
                    const patient = data[hn];
                    if (patient['Device no']) {
                        Object.keys(patient['Device no']).forEach(deviceId => {
                            const deviceData = patient['Device no'][deviceId];
                            // Check predicting painlevel
                            if (deviceData.predict && deviceData.predict.painlevel == 1) {
                                activeAlerts.push({
                                    id: hn,
                                    name: patient.name || 'Unknown',
                                    // Try multiple variations for Bed number key
                                    bed: patient['Bad no'] || patient['Bad_no'] || patient['Bed no'] || patient['Room'] || patient['bed_no'] || 'Unknown',
                                    time: deviceData.predict.timestamp || 'Now',
                                    severity: 'Severe Pain',
                                    hn: hn
                                });
                            }
                        });
                    }
                });
                setAlerts(activeAlerts);
            } else {
                setAlerts([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const handlePatientClick = (patient) => {
      setSelectedPatient(patient);
      setBedNo('');
      setDeviceNo('');
      setError('');
      setShowNewPatients(false); 
    };

    const handleSave = async () => {
      if (!bedNo || !deviceNo) {
        setError('All fields are required.');
        return;
      }
      try {
        const patientRef = ref(db, `patient/${selectedPatient.HN}`);
        const patientData = {
          ...selectedPatient,
          Room: bedNo,
          DeviceID: deviceNo,
          ['Bed no']: bedNo, 
          ['Assigned_Device_ID']: deviceNo
        };
        await update(patientRef, patientData);
        
        const allPatientsRef = ref(db, `Allpatients/${selectedPatient.HN}`);
        await update(allPatientsRef, {
          Room: bedNo,
          DeviceID: deviceNo,
          ['Bed no']: bedNo, 
          ['Assigned_Device_ID']: deviceNo
        });
        
        setSelectedPatient(null);
        setBedNo('');
        setDeviceNo('');
        alert("Patient data saved successfully!");
      } catch (err) {
        console.error("Error saving patient data:", err);
        setError('Failed to save data. Please try again.');
      }
    };

    const handleAcknowledge = (alertId) => {
        // For now, just remove from local state to dismiss
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

  return (
    <>
      <header className="w-full px-6 py-3 bg-[#bfdbfe] shadow-sm flex items-center justify-between relative z-50">
        {/* Left Section: Menu Toggle */}
        <button 
          onClick={() => setSidebarOpen(true)}
          className="text-gray-800 hover:text-gray-600 transition-colors"
        >
          <MenuOutlined className="text-2xl" />
        </button>

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => {
              setShowNewPatients(!showNewPatients);
              if (!showNewPatients) setShowAlerts(false);
            }}
            className="text-gray-700 hover:text-gray-900 transition-colors relative"
          >
            <FileTextOutlined className="text-2xl" />
            {showNewPatients && (
              <div 
                className="absolute top-12 right-0 w-96 bg-white rounded-lg shadow-xl border border-blue-100 z-[100] cursor-default text-left"
                onClick={(e) => e.stopPropagation()} 
              >
                <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">New Patient</h3>
                    <p className="text-blue-500 text-sm">Chronological order</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">{newPatients.length}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        setShowNewPatients(false);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <MinusCircleFilled className="text-xl" />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {newPatients.length > 0 ? (
                    newPatients.map((patient) => (
                      <div 
                        key={patient.HN} 
                        onClick={() => handlePatientClick(patient)}
                        className="bg-gray-200 p-4 rounded-md flex justify-between items-center shadow-sm cursor-pointer hover:bg-gray-300 transition-colors"
                      >
                        <span className="font-semibold text-gray-900 text-[#1e3a8a]">{patient.name}</span>
                        <span className="font-bold text-gray-900 text-[#1e3a8a]">HN : {patient.HN}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">No new patients found</div>
                  )}
                </div>
              </div>
            )}
          </button>

          <button 
            onClick={() => {
              setShowAlerts(!showAlerts);
              if (!showAlerts) setShowNewPatients(false);
            }}
            className="relative text-gray-700 hover:text-gray-900 transition-colors mr-2"
          >
            <BellFilled className="text-2xl" />
            {alerts.length > 0 && (
                <span className="absolute top-0 right-[-2px] w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#bfdbfe]"></span>
            )}
            
            {/* Alert Dropdown */}
            {showAlerts && (
                <div 
                    className="absolute top-12 right-0 w-96 bg-white rounded-lg shadow-xl border border-blue-100 z-[100] cursor-default text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">New Alert</h3>
                            <p className="text-blue-500 text-sm">Chronological order</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-900">{alerts.length}</span>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    setShowAlerts(false);
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <MinusCircleFilled className="text-xl" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                        {alerts.length > 0 ? (
                            alerts.map((alert, index) => (
                                <div key={`${alert.id}-${index}`} className="bg-gray-200 p-4 rounded-md shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg">{alert.name}</h4>
                                            <p className="text-gray-600 font-medium">Bed #{alert.bed}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                                <ClockCircleOutlined /> {alert.time.split(' ')[1] || 'Now'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                                            {alert.severity}
                                        </span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAcknowledge(alert.id);
                                            }}
                                            className="bg-[#ff8fa3] hover:bg-[#ff758f] text-red-900 text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                                        >
                                            Acknowledge
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 py-4">No active alerts</div>
                        )}
                    </div>
                </div>
            )}
          </button>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white">
              <UserOutlined className="text-lg" />
            </div>
            <div className="flex flex-col leading-tight pr-1">
              <span className="text-xs font-bold text-gray-900">ICU</span>
              <span className="text-[10px] font-medium text-gray-500">แผนก</span>
            </div>
          </div>
        </div>
      </header>

      {/* More Information Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
             {/* Header */}
             <div className="p-6 pb-2">
               <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-gray-900">More Information</h2>
                 <button 
                    onClick={() => handleSave()}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md font-bold transition-colors"
                 >
                   SAVE
                 </button>
               </div>
               <p className="text-red-500 text-sm mt-1">All fields are required. *</p>
               {error && <p className="text-red-600 text-sm font-bold mt-2">{error}</p>}
             </div>
             
             {/* Body */}
             <div className="p-6 pt-4 space-y-6">
               {/* Patient Info Row */}
               <div className="flex justify-between items-center text-[#1e3a8a] font-bold text-lg">
                 <span>{selectedPatient.name}</span>
                 <span>HN : {selectedPatient.HN}</span>
               </div>

               {/* Inputs */}
               <div className="space-y-4">
                 <div>
                   <label className="block text-gray-900 font-bold mb-2">Bed no :</label>
                   <input 
                     type="text" 
                     value={bedNo}
                     onChange={(e) => setBedNo(e.target.value)}
                     className="w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                   />
                 </div>
                 <div>
                   <label className="block text-gray-900 font-bold mb-2">Device no :</label>
                   <input 
                     type="text" 
                     value={deviceNo}
                     onChange={(e) => setDeviceNo(e.target.value)}
                     className="w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                   />
                 </div>
               </div>
             </div>
             
             {/* Close/Cancel Area (Optional, implies clicking outside or added button, but Save/Close usually standard. 
                 Adding a cancel functionality by clicking outside or a subtle button.)
             */}
             <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Sidebar Drawer */}
      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Drawer Content */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#f0f9ff] z-[70] transform transition-transform duration-300 ease-in-out shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          {/* Logo Section */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="text-blue-600 text-2xl">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-[#1e40af]">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" strokeWidth="2"/>
                    {/* Simple pulse line overlay if needed, but simple heart is fine for mimic */}
                 </svg>
              </div>
              <div className="text-xl font-bold text-[#1e3a8a]">
                PainCare <span className="text-[#3b82f6]">Monitor</span>
              </div>
            </div>
            <p className="text-xs text-gray-900 font-medium tracking-wide">Smart Alert for Patient</p>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            <button 
              onClick={() => {
                setSidebarOpen(false);
                router.push('/');
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-semibold ${
                activeMenu === 'dashboard' 
                  ? 'bg-[#0ea5e9] text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-blue-50'
              }`}
            >
              <PieChartOutlined className="text-2xl" />
              <span className="text-lg">Dashboard</span>
            </button>

            <button 
              onClick={() => {
                setSidebarOpen(false);
                router.push('/monitor');
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-semibold ${
                activeMenu === 'monitor' 
                  ? 'bg-[#0ea5e9] text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-blue-50'
              }`}
            >
              <AppstoreOutlined className="text-2xl" />
              <span className="text-lg">Monitor</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Header;
