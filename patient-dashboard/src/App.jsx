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

  // Implement real-time listener for the Doctor's patient list
  useEffect(() => {
    setDebugLog("STEP 1: Attempting to subscribe to RTDB path 'Doctor/DOC-TEST-001'...");

    // SAFETY CHECK: Warn if likely using mock config
    const connectionTimeout = setTimeout(() => {
      setDebugLog("TIMEOUT: Connection taking too long. Please check your firebase config/internet.");
    }, 8000);

    try {
      // 1. Listen to the Doctor node in Realtime Database
      const doctorRef = ref(db, 'Doctor/DOC-TEST-001');

      const unsubscribe = onValue(doctorRef, async (snapshot) => {
        clearTimeout(connectionTimeout);
        if (snapshot.exists()) {
          const docData = snapshot.val();
          const keys = Object.keys(docData);
          // 1. Capture Doctor Name (to display on patient card if missing)
          const doctorName = docData.name || "Unknown Doctor";

          setDebugLog(`STEP 2: Found Doctor Node (${doctorName}). Fields: ${keys.join(', ')}`);

          if (docData.Patients) {
            const patientsMap = docData.Patients;
            const patientIds = Object.keys(patientsMap);
            setDebugLog(`STEP 3: Found 'Patients' node with ${patientIds.length} IDs: ${patientIds.join(', ')}`);

            if (patientIds.length === 0) {
              setPatients([]);
              setDebugLog("STEP 3: 'Patients' node is empty.");
              return;
            }

            // 2. Fetch details for each patient ID from the 'patient' node
            const patientsDataProms = patientIds.map(async (pid) => {
              try {
                const cleanId = pid.trim();
                // Assuming 'patient' is a root node alongside 'Doctor'
                const patientRef = child(ref(db), `patient/${cleanId}`);
                const pSnapshot = await get(patientRef);

                if (pSnapshot.exists()) {
                  const pData = pSnapshot.val();
                  return {
                    id: cleanId,
                    ...pData,
                    // Map specific fields requested by user
                    doctor: pData.doctor || doctorName, // Use Doctor Node name if patient doesn't have one
                    bedNumber: pData.bedNumber || pData.BedNumber || '-',
                    deviceNumber: pData.deviceNumber || pData.DeviceNumber || pData.device_id || '-'
                  };
                } else {
                  console.warn(`Patient not found at 'patient/${cleanId}'`);
                  return { id: cleanId, name: 'Data Missing', gender: '-', doctor: doctorName, deviceNumber: '-', bedNumber: '-', statusLabel: 'Missing', statusType: 'neutral' };
                }
              } catch (err) {
                console.error(`Error fetching patient ${pid}:`, err);
                return { id: pid, name: 'Error', doctor: doctorName, statusLabel: 'Error', statusType: 'danger' };
              }
            });

            const patientsData = await Promise.all(patientsDataProms);
            setPatients(patientsData);
            setDebugLog(`STEP 4: Loaded ${patientsData.length} patients successfully.`);
          } else {
            console.warn("Doctor node found but missing 'Patients' field.");
            setDebugLog("STEP 3 Fail: 'Patients' field missing in Doctor node.");
            setPatients([]);
          }
        } else {
          setPatients([]);
          setDebugLog("STEP 2 Fail: Node 'Doctor/DOC-TEST-001' does not exist in Realtime Database.");
        }
      }, (error) => {
        console.error("Error connecting to Doctor node:", error);
        setDebugLog(`STEP 1 Fail: Connection Error: ${error.message}`);
      });

      // Cleanup listener
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
