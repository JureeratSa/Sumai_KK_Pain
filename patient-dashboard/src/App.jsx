import { useEffect, useState } from 'react';
import Header from './components/Header';
import PatientCard from './components/PatientCard';
import EditPatientModal from './components/EditPatientModal';
import { db } from './firebase';
import { ref, onValue, get, update, child } from 'firebase/database';
import './App.css';

function App() {
  const [patients, setPatients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [debugLog, setDebugLog] = useState("Initializing Realtime Database connection...");

  // Implement real-time listener for the Patient list
  useEffect(() => {
    setDebugLog("STEP 1: Attempting to subscribe to RTDB path 'patient'...");

    try {
      // Listen to the patient node directly
      const patientsRef = ref(db, 'patient');

      const unsubscribe = onValue(patientsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setDebugLog(`STEP 2: Found ${Object.keys(data).length} patients.`);

          const patientsData = Object.keys(data).map(key => {
            const p = data[key];
            return {
              id: key,
              ...p,
              // Map fields
              doctor: p.doctor || p.Doctor_ID || "Unknown Doctor",
              bedNumber: p.bedNumber || p.BedNumber || p.Bed || p.bed || p.Bad_no || p['Bad no'] || p['Bed no'] || '-',
              deviceNumber: p.deviceNumber || p.DeviceNumber || p.device_id || p.Assigned_Device_ID || '-'
            };
          });

          setPatients(patientsData);
        } else {
          setPatients([]);
          setDebugLog("STEP 2: 'patient' node is empty or not found.");
        }
      }, (error) => {
        console.error("Error connecting to patient node:", error);
        setDebugLog(`STEP 1 Fail: Connection Error: ${error.message}`);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Setup Error:", err);
      setDebugLog(`Setup Exception: ${err.message}`);
    }
  }, []);

  const handleEditClick = (patient) => {
    setCurrentPatient(patient);
    setIsModalOpen(true);
  };

  const handleSavePatient = async (updatedPatient) => {
    // Update local state
    setPatients(prevPatients =>
      prevPatients.map(p => p.id === updatedPatient.id ? updatedPatient : p)
    );

    // Update Firebase Realtime Database
    try {
      const patientRef = ref(db, `patient/${updatedPatient.id}`);
      await update(patientRef, {
        name: updatedPatient.name,
        doctor: updatedPatient.doctor,
        bedNumber: updatedPatient.bedNumber,
        deviceNumber: updatedPatient.deviceNumber || '-'
      });
      console.log("Patient updated successfully!");
    } catch (error) {
      console.error("Error updating patient: ", error);
      alert("Error saving: " + error.message);
    }
  };

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <h1 className="page-title">Patients</h1>

        <div className="patient-list">
          {patients.map((patient, index) => (
            <PatientCard
              key={index}
              patient={patient}
              onEdit={() => handleEditClick(patient)}
            />
          ))}
        </div>

        <div className="pagination">
          <span className="showing-text">Showing 1 to {patients.length} of {patients.length} entries</span>
          <div className="page-controls">
            <button className="page-btn">Previous</button>
            <button className="page-btn active">1</button>
            <button className="page-btn">Next</button>
          </div>
        </div>

        {currentPatient && (
          <EditPatientModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            patient={currentPatient}
            onSave={handleSavePatient}
          />
        )}
      </main>
      <footer className="footer-bar">
        <div style={{ padding: '10px', fontSize: '12px', color: '#666', background: '#f5f5f5', textAlign: 'center' }}>
          Debug Status: {debugLog}
        </div>
      </footer>
    </div>
  );
}

export default App;
