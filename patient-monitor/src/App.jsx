import { useEffect, useState } from 'react';
import Header from './components/Header';
import { db } from './firebase';
import { ref, onValue, get, child } from 'firebase/database';
import './App.css';
import patientIcon from './assets/patient_icon.svg';
import bedIcon from './assets/bed_icon.svg';

function App() {
    const [patients, setPatients] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        pain: 0,
        noPain: 0,
        men: 0,
        women: 0,
        occupancy: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to the Doctor node in Realtime Database
        const doctorRef = ref(db, 'Doctor/DOC-TEST-001');

        const unsubscribe = onValue(doctorRef, async (snapshot) => {
            if (snapshot.exists()) {
                const docData = snapshot.val();

                if (docData.Patients) {
                    const patientIds = Object.keys(docData.Patients);

                    if (patientIds.length === 0) {
                        setPatients([]);
                        setLoading(false);
                        return;
                    }

                    const patientsDataProms = patientIds.map(async (pid) => {
                        try {
                            const cleanId = pid.trim();
                            const patientRef = child(ref(db), `patient/${cleanId}`);
                            const pSnapshot = await get(patientRef);

                            if (pSnapshot.exists()) {
                                const pData = pSnapshot.val();
                                return { id: cleanId, ...pData };
                            } else {
                                return { id: cleanId, name: 'Unknown', statusType: 'neutral', gender: 'unknown' };
                            }
                        } catch (err) {
                            return { id: pid, name: 'Error', statusType: 'danger' };
                        }
                    });

                    const patientsData = await Promise.all(patientsDataProms);
                    setPatients(patientsData);

                    // Calculate Stats
                    const total = patientsData.length;
                    const pain = patientsData.filter(p => p.statusType === 'danger' || p.statusLabel === 'Pain').length;
                    const noPain = patientsData.filter(p => p.statusType === 'success' || p.statusLabel === 'No Pain').length;
                    const men = patientsData.filter(p => p.gender?.toLowerCase() === 'male' || p.gender === 'ชาย').length;
                    const women = patientsData.filter(p => p.gender?.toLowerCase() === 'female' || p.gender === 'หญิง').length;

                    // Mocking total beds as 50 for percentage calculation (or calculate locally if bed count known)
                    const occupancy = Math.round((total / 50) * 100);

                    setStats({ total, pain, noPain, men, women, occupancy });
                } else {
                    setPatients([]);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Calculate Pie Chart Conic Gradient based on real data
    const totalGender = stats.men + stats.women;
    const womenPercent = totalGender > 0 ? (stats.women / totalGender) * 100 : 50;
    const pieStyle = {
        background: `conic-gradient(#818cf8 0% ${womenPercent}%, #fb7185 ${womenPercent}% 100%)`
    };

    return (
        <div className="dashboard-container">
            <Header />

            <main className="dashboard-content">
                {/* Top Stats Row */}
                {/* Top Stats Row */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon-wrapper">
                            <img src={patientIcon} alt="Total Patients" />
                        </div>
                        <div className="stat-info">
                            <h3>Total Patients</h3>
                            <div className="stat-value">{loading ? '-' : stats.total}</div>
                            <div className="stat-trend positive">↑ + 3 % from last week</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon-wrapper">
                            <img src={bedIcon} alt="Bed Occupancy" />
                        </div>
                        <div className="stat-info">
                            <h3>Bed Occupancy Rate</h3>
                            <div className="stat-value">{loading ? '-' : `${stats.occupancy} %`}</div>
                            <div className="stat-subtext green-text">Beds available {50 - stats.total} beds</div>
                        </div>
                    </div>
                </div>

                {/* Pain Stats Row */}
                <div className="pain-stats-row">
                    <div className="pain-card no-pain">
                        <h3>No pain</h3>
                        <div className="pain-value">{loading ? '-' : stats.noPain}</div>
                        <div className="pain-label">cases</div>
                    </div>
                    <div className="pain-card pain">
                        <h3>Pain</h3>
                        <div className="pain-value">{loading ? '-' : stats.pain}</div>
                        <div className="pain-label">cases</div>
                    </div>
                </div>

                {/* Charts & Updates Row */}
                <div className="main-grid">
                    {/* Gender Distribution */}
                    <div className="chart-card">
                        <h3>Gender Distribution</h3>
                        <div className="pie-chart-container">
                            <div className="pie-chart" style={pieStyle}></div>
                            <div className="pie-legend">
                                <div className="legend-item"><span className="dot women"></span> Women {stats.women}</div>
                                <div className="legend-item"><span className="dot men"></span> Men {stats.men}</div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Patient Updates */}
                    <div className="updates-card">
                        <div className="updates-header">
                            <h3>Recent Patient Update</h3>
                            <span className="live-badge">Live Update</span>
                        </div>
                        <div className="updates-list">
                            {patients.length === 0 && !loading && <div style={{ padding: '20px', textAlign: 'center' }}>No patients found</div>}
                            {patients.slice(0, 3).map((patient, index) => (
                                <div className="update-item" key={index}>
                                    <div className="patient-avatar-placeholder">
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                    </div>
                                    <div className="update-info">
                                        <h4>{patient.name || 'Unknown Name'}</h4>
                                        <span className="update-bed">Bed {patient.bedNumber ? `#${patient.bedNumber}` : '#--'}</span>
                                        {patient.statusType === 'danger' || patient.statusLabel === 'Pain' ? (
                                            <span className="update-status-badge">Pain</span>
                                        ) : null}
                                    </div>
                                    <div className="update-meta">
                                        <span className="update-time">{index === 0 ? 'Now' : index === 1 ? '12 min ago' : '30 min ago'}</span>
                                        {(patient.statusType === 'danger' || patient.statusLabel === 'Pain') && (
                                            <button className="acknowledge-btn">Acknowledge</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pagination-simple">
                            <span>Previous</span>
                            <span className="page-num active">1</span>
                            <span className="page-num">2</span>
                            <span>Next</span>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="dashboard-footer">
                Patient Monitor System v1.0
            </footer>
        </div>
    );
}

export default App;
