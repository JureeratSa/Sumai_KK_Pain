"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import Header from './components/Header';
import PatientCard from '../../components/PatientCard';
import EditPatientModal from '../../components/EditPatientModal';
import { db } from '../../firebase';
import { ref, onValue, get, update, child } from 'firebase/database';
import './Monitor.css';

const MonitorPage = () => {
    const router = useRouter(); 
    const [patients, setPatients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPatient, setCurrentPatient] = useState(null);
    const [debugLog, setDebugLog] = useState("Initializing Realtime Database connection...");

    const handlePatientClick = (id) => {
        router.push(`/patient/${id}`);
    };

    // Implement real-time listener for ALL patients
    useEffect(() => {
        setDebugLog("STEP 1: Connecting to 'patient' node...");

        const patientsRef = ref(db, 'patient');

        const unsubscribe = onValue(patientsRef, (snapshot) => {
            if (snapshot.exists()) {
                const patientsMap = snapshot.val();
                setDebugLog(`STEP 2: Found ${Object.keys(patientsMap).length} patients.`);
                
                const patientsData = Object.keys(patientsMap).map(key => {
                    const pData = patientsMap[key];

                    // Extract pain status from predict node
                    let painStatus = 'normal';
                    let painLevel = null;
                    const devices = pData['Device no'];
                    if (devices && typeof devices === 'object') {
                        // Check the first device that has a predict node
                        for (const devId of Object.keys(devices)) {
                            const predict = devices[devId]?.predict;
                            if (predict && predict.painlevel !== undefined) {
                                painLevel = predict.painlevel;
                                painStatus = predict.painlevel >= 1 ? 'pain' : 'normal';
                                break;
                            }
                        }
                    }

                    return {
                        id: key,
                        ...pData,
                        // Detailed Mapping
                        name: pData.name || 'Unknown',
                        doctor: pData.Doctor_name || pData.doctor || 'Unknown Doctor',
                        bedNumber: pData['Bed no'] || pData['Bad no'] || pData.Room || pData.bedNumber || '-',
                        deviceNumber: pData['Assigned_Device_ID'] || pData.deviceNumber || '-',
                        painStatus: painStatus,
                        painLevel: painLevel
                    };
                });

                setPatients(patientsData);
                setDebugLog(`STEP 3: Loaded ${patientsData.length} patients.`);
            } else {
                setPatients([]);
                setDebugLog("STEP 2: 'patient' node is empty.");
            }
        }, (error) => {
            console.error("Error connecting to patient node:", error);
            setDebugLog(`Error: ${error.message}`);
        });

        return () => unsubscribe();
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
        {/* <Header /> */}
        <main className="main-content">
            <h1 className="page-title">Patients</h1>

            <div className="patient-list">
            {patients.map((patient, index) => (
                <PatientCard
                key={index}
                patient={patient}
                onEdit={() => handleEditClick(patient)}
                onClick={() => handlePatientClick(patient.id)}
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

export default MonitorPage;
