"use client";
import { useEffect, useState } from "react";
import { query, ref, onValue } from "firebase/database";
import { db } from "../../firebase";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PatientDetail = () => {
  const { id } = useParams();
  const [patientData, setPatientData] = useState();
  const [doctorData, setDoctorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("patient-info");
  const [edaHistory, setEdaHistory] = useState([]); // Array to store {time, value} objects
  const [ppgHistory, setPpgHistory] = useState([]); // Array to store {time, value} objects for PPG
  const [range, setRange] = useState('Now'); // 'Now', '1D', '1W'


  useEffect(() => {
    if (!id) return;
    const patientRef = ref(db, `patient/${id}`);
    const doctorRef = ref(db, 'Doctor');

    const unsubscribePatient = onValue(patientRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPatientData(data);

        // --- Data Accumulation Logic for Charts ---
        if (data["Device no"]) {
           const devices = Object.values(data["Device no"]);
           let currentEda = null;
           let currentPpg = null; // Add PPG var
           let currentTs = null;

           for (const device of devices) {
              // Priority: 1 s > 1s
              if (device['1 s']) {
                  currentEda = device['1 s'].EDA;
                  currentPpg = device['1 s'].PPG; // Get PPG
                  currentTs = device['1 s'].timestamp;
                  break; 
              }
              if (device['1s']) {
                  currentEda = device['1s'].EDA;
                  currentPpg = device['1s'].PPG; // Get PPG
                  currentTs = device['1s'].timestamp;
                  break;
              }
           }

           if (currentTs) {
               // Update EDA
               if (currentEda !== null) {
                   const newItem = { 
                       time: new Date(currentTs), 
                       value: Number(currentEda) 
                   };
                   
                   setEdaHistory(prev => {
                       if (prev.length > 0 && prev[prev.length - 1].time.getTime() === newItem.time.getTime()) return prev;
                       const newHistory = [...prev, newItem];
                       if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
                       return newHistory;
                   });
               }

               // Update PPG
               if (currentPpg !== null) {
                   const newItem = { 
                       time: new Date(currentTs), 
                       value: Number(currentPpg) 
                   };
                   
                   setPpgHistory(prev => {
                       if (prev.length > 0 && prev[prev.length - 1].time.getTime() === newItem.time.getTime()) return prev;
                       const newHistory = [...prev, newItem];
                       if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
                       return newHistory;
                   });
               }
           }
        }
        // ------------------------------------------
      }
      setLoading(false);
    });

    const unsubscribeDoctor = onValue(doctorRef, (snapshot) => {
        const doctors = snapshot.val();
        if (doctors) {
            const foundDoctor = Object.values(doctors).find(doc => 
                doc.Patients && doc.Patients[id] === true
            );
            if (foundDoctor) {
                setDoctorData(foundDoctor);
            }
        }
    });

    return () => {
        unsubscribePatient();
        unsubscribeDoctor();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Helper Data Extraction
  let latest = null;
  let realtime = null;

  if (patientData?.["Device no"]) {
      const devices = Object.values(patientData["Device no"]);

      // 1. Find Latest Prediction (for Pain History & Doctor Info)
      const allPredicts = devices.map(d => d.predict).filter(p => p && p.timestamp);
      if (allPredicts.length > 0) {
        allPredicts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        latest = allPredicts[0];
      }

      // 2. Find Realtime Data (1s) or Summary (1min) for Charts (Heart Rate / EDA)
      for (const device of devices) {
          // Check for "1 s" (common) or "1s"
          if (device['1 s']) {
              realtime = device['1 s'];
              break; 
          }
          if (device['1s']) {
              realtime = device['1s'];
              break;
          }
      }
  }

  const formatTime = (ts) => {
      if (!ts) return "-";
      return new Date(ts).toLocaleString('en-US', { 
        month: 'long', day: 'numeric', year: 'numeric', 
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true 
      });
  };

  // --- Mock Data Generator ---
  const getMockData = (type, range) => {
      const count = range === '1D' ? 24 : 7; // Points: 24h or 7d
      const data = [];
      const now = new Date();
      
      for (let i = count; i >= 0; i--) {
          const t = new Date(now);
          if (range === '1D') t.setHours(t.getHours() - i);
          else t.setDate(t.getDate() - i);

          let val;
          if (type === 'heart') {
              // Mock HR between 70-100 with some random noise
              val = 70 + Math.random() * 30 + (Math.sin(i) * 10);
          } else {
              // Mock EDA between 0.01 - 0.05
              val = 0.02 + Math.random() * 0.02 + (Math.cos(i) * 0.01);
          }
          data.push({
              time: range === '1D' ? t.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : t.toLocaleDateString([], {weekday: 'short'}),
              value: val
          });
      }
      return data;
  };

  // ---------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar - Patient Card (1/4 width) */}
        <div className="w-1/4 bg-white p-6 border-r border-gray-100 overflow-y-auto">
             {/* Profile Image & Name */}
            <div className="flex flex-col items-center mb-6">
              {/* Image Removed */}

              <h2 className="text-xl font-bold text-[#1e3a8a] text-center">
                {patientData?.name || "-"}
              </h2>
              <p className="text-blue-600 font-medium">HN : {id}</p>
            </div>

            {/* Status Badge */}
            <div className="mb-8 text-center">
               {latest?.painlevel === 1 ? (
                 <span className="bg-[#fee2e2] text-red-800 px-8 py-1.5 rounded-md font-semibold text-sm inline-block w-full">
                   Pain
                 </span>
               ) : (
                 <span className="bg-[#baea9e] text-[#1e3a8a] px-8 py-1.5 rounded-md font-semibold text-sm inline-block w-full">
                   Normal
                 </span>
               )}
            </div>

            {/* Details Section */}
            <div className="mb-6">
              <h3 className="text-[#1e3a8a] font-bold border-b border-gray-200 pb-2 mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Bed no.</span>
                  <span className="font-bold text-gray-800">{patientData?.["Bad no"] || patientData?.["Bed no"] || patientData?.Room || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Age</span>
                  <span className="font-bold text-gray-800">{patientData?.Age || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gender</span>
                  <span className="font-bold text-gray-800">{patientData?.Gender || patientData?.Sex || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Blood group</span>
                  <span className="font-bold text-gray-800">{patientData?.["Blood group"] || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Height (cm)</span>
                  <span className="font-bold text-gray-800">{patientData?.Heigh || patientData?.Height || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Weight(kg)</span>
                  <span className="font-bold text-gray-800">{patientData?.Weight || "-"}</span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-gray-500">BMI(kg/m2)</span>
                  <span className="font-bold text-gray-800">{patientData?.BMI || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Admission Date</span>
                  <span className="font-bold text-gray-800">{patientData?.["Admission Date"] || "-"}</span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-gray-500">Device no.</span>
                  <span className="font-bold text-gray-800">{patientData?.["Assigned_Device_ID"] || "-"}</span>
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="mb-6">
              <h3 className="text-[#1e3a8a] font-bold border-b border-gray-200 pb-2 mb-2">Primary Diagnosis</h3>
               <p className="font-bold text-gray-800 text-sm">{patientData?.Diagnosis || "-"}</p>
            </div>

             {/* Allergies */}
            <div className="mb-6">
              <h3 className="text-[#1e3a8a] font-bold border-b border-gray-200 pb-2 mb-2">Allergies</h3>
               <ul className="list-disc pl-5 text-sm font-bold text-gray-800">
                {patientData?.Allergies ? (
                    Array.isArray(patientData.Allergies) ? 
                        patientData.Allergies.map((allergy, i) => <li key={i}>{allergy}</li>) 
                        : <li>{patientData.Allergies}</li>
                ) : (
                    <li>-</li>
                )}
              </ul>
            </div>
        </div>

        {/* Right Content Area (3/4 width) - Main Dashboard */}
        <div className="w-3/4 bg-gray-50 overflow-y-auto p-6">
           <div className="grid grid-cols-3 gap-6">
             
             {/* Middle Column (Charts) */}
             <div className="col-span-2 space-y-6">
               
               {/* Heart Rate Chart */}
               <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <h3 className="font-bold text-gray-900">Heart rate</h3>
                     <p className="text-xs text-gray-500">
                        {realtime?.timestamp ? formatTime(realtime.timestamp) : (latest?.timestamp ? formatTime(latest.timestamp) : "November 26, 2025 at 7:50:26 PM +07")}
                     </p>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 rounded p-0.5">
                        <button onClick={() => setRange('Now')} className={`px-2 py-0.5 text-xs font-bold rounded ${range === 'Now' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}>Now</button>
                        <button onClick={() => setRange('1D')} className={`px-2 py-0.5 text-xs font-bold rounded ${range === '1D' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}>1 D</button>
                        <button onClick={() => setRange('1W')} className={`px-2 py-0.5 text-xs font-bold rounded ${range === '1W' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}>1 W</button>
                      </div>
                      <div className="text-right">
                         <span className="block text-sm font-bold text-blue-500">
                            {realtime?.PPG !== undefined ? Math.round(realtime.PPG) : (latest?.PPG_Hrv !== undefined ? Math.round(latest.PPG_Hrv) : "89")} bmp
                         </span>
                         <span className="block text-[10px] text-gray-400">Average</span>
                      </div>
                   </div>
                 </div>
                 {/* Real Chart */}
                 <div className="h-40 w-full">
                    <Line 
                       data={{
                           labels: range === 'Now' ? ppgHistory.map(d => d.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })) : getMockData('heart', range).map(d => d.time),
                           datasets: [{
                               label: 'Heart Rate (PPG)',
                               data: range === 'Now' ? ppgHistory.map(d => d.value) : getMockData('heart', range).map(d => d.value),
                               borderColor: '#3b82f6', // Blue-500
                               backgroundColor: 'rgba(59, 130, 246, 0.1)',
                               tension: 0.4, // Smooth curve for PPG
                               pointRadius: range === 'Now' ? 0 : 3,
                               borderWidth: 2,
                               fill: true,
                           }]
                       }}
                       options={{
                           responsive: true,
                           maintainAspectRatio: false,
                           animation: { duration: 0 }, 
                           scales: {
                               x: {
                                   display: true,
                                   grid: { display: false },
                                   ticks: { maxTicksLimit: 5 }
                               },
                               y: {
                                   display: true, 
                               }
                           },
                           plugins: {
                               legend: { display: false },
                               tooltip: { enabled: true }
                           }
                       }}
                    />
                 </div>
               </div>

               {/* EDA Chart */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">Electrodermal activity</h3>
                      <p className="text-xs text-gray-500">
                         {realtime?.timestamp ? formatTime(realtime.timestamp) : (latest?.timestamp ? formatTime(latest.timestamp) : "Loading...")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100 rounded p-0.5">
                         <button onClick={() => setRange('Now')} className={`px-2 py-0.5 text-xs font-bold rounded ${range === 'Now' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}>Now</button>
                         <button onClick={() => setRange('1D')} className={`px-2 py-0.5 text-xs font-bold rounded ${range === '1D' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}>1 D</button>
                         <button onClick={() => setRange('1W')} className={`px-2 py-0.5 text-xs font-bold rounded ${range === '1W' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}>1 W</button>
                       </div>
                       <div className="text-right">
                          <span className="block text-sm font-bold text-blue-500">
                             {realtime?.EDA !== undefined ? Number(realtime.EDA).toFixed(5) : (latest?.EDA_tonic !== undefined ? Number(latest.EDA_tonic).toFixed(5) : "-")} mu
                          </span>
                          <span className="block text-[10px] text-gray-400">Average</span>
                       </div>
                    </div>
                  </div>
                  {/* Real Chart */}
                  <div className="h-40 w-full">
                     <Line 
                        data={{
                            labels: range === 'Now' ? edaHistory.map(d => d.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })) : getMockData('eda', range).map(d => d.time),
                            datasets: [{
                                label: 'EDA',
                                data: range === 'Now' ? edaHistory.map(d => d.value) : getMockData('eda', range).map(d => d.value),
                                borderColor: '#8b5cf6', // Purple-500
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                tension: 0, // Sharp angles (มุมแหลม)
                                pointRadius: range === 'Now' ? 0 : 3,
                                borderWidth: 2,
                                fill: true,
                            }]
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: { duration: 0 }, // Disable animation for realtime performance
                            scales: {
                                x: {
                                    display: true,
                                    grid: { display: false },
                                    ticks: { maxTicksLimit: 5 }
                                },
                                y: {
                                    display: true, // Hide Y axis as per design style or keep minimal? User didn't specify, but design often hides it. Let's hide for clean look.
                                    min: 0, // EDA is positive
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: { enabled: true }
                            }
                        }}
                     />
                  </div>
                </div>

                 {/* Treatment History */}
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                 <h3 className="font-bold text-gray-900 mb-4">Treatment History</h3>
                 <div className="space-y-4">
                    {/* Check if treatment history exists in data, else use static */}
                    {patientData?.Treatment_History ? (
                        Object.values(patientData.Treatment_History).map((item, index) => (
                            <div key={index} className="flex justify-between text-sm items-start border-b border-gray-50 pb-3 last:border-0 text-gray-800">
                               <div className="w-1/5 font-bold">{item.time || "-"}</div>
                               <div className="w-3/5 text-gray-700 px-2 font-medium">{item.action || "-"}</div>
                               <div className="w-1/5 text-right font-bold">{item.staff || "-"}</div>
                            </div>
                        ))
                    ) : (
                        <>
                            <div className="flex justify-between text-sm items-start border-b border-gray-50 pb-3 text-gray-800">
                               <div className="w-1/5 font-bold">Nov 25, 8:00 AM</div>
                               <div className="w-3/5 text-gray-700 px-2 font-medium">Initiated emergency medications (MONA) and prioritized for intervention.</div>
                               <div className="w-1/5 text-right font-bold">ED Physician and Nurses</div>
                            </div>
                            <div className="flex justify-between text-sm items-start border-b border-gray-50 pb-3 text-gray-800">
                               <div className="w-1/5 font-bold">Nov 25, 10:30 AM</div>
                               <div className="w-3/5 text-gray-700 px-2 font-medium">Performed Percutaneous Coronary Intervention (PCI) with stent placement to open the vessel.</div>
                               <div className="w-1/5 text-right font-bold">Interventional Cardiologist</div>
                            </div>
                            <div className="flex justify-between text-sm items-start border-b border-gray-50 pb-3 text-gray-800">
                               <div className="w-1/5 font-bold">Nov 25 - Nov 26 (Ongoing)</div>
                               <div className="w-3/5 text-gray-700 px-2 font-medium">Continuous Anticoagulation (Heparin Drip) and management of BP/heart rate.</div>
                               <div className="w-1/5 text-right font-bold">Intensivist/ Critical Care Physician</div>
                            </div>
                            <div className="flex justify-between text-sm items-start text-gray-800">
                               <div className="w-1/5 font-bold">Nov 26, 7:50 PM</div>
                               <div className="w-3/5 text-gray-700 px-2 font-medium">Reassessment (Found HR 89, Moderate Pain) and medication adjustment.</div>
                               <div className="w-1/5 text-right font-bold">CCU Physician and CUU Nurses</div>
                            </div>
                        </>
                    )}
                 </div>
               </div>

             </div>

             {/* Right Column (Doctor & Pain History) */}
             <div className="col-span-1 space-y-6">
                
                {/* Doctor Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                       {/* Doctor Image Removed */}
                       <div>
                          <h3 className="font-bold text-[#1e3a8a] text-lg">{doctorData?.name || patientData?.Doctor_name || "Jane Dhoe"}</h3>
                          <p className="text-xs text-gray-500 font-bold">{doctorData?.specialist || "Cardiologist"}</p>
                          <p className="text-xs text-blue-500">{patientData?.name ? `${patientData.name.split(' ')[0]}'s Doctor` : "Patient's Doctor"}</p>
                       </div>
                    </div>
                    <div className="text-xs text-blue-500 mb-2 font-bold cursor-pointer">Details</div>
                    <div className="text-xs space-y-2 text-gray-800">
                       <p><span className="font-bold">Time of Assessment : </span> {latest?.timestamp ? formatTime(latest.timestamp) : "November 26, 2025, at 7:50 PM"}</p>
                       <p><span className="font-bold">Chief Complaint : </span> No active Chest Pain (NACP) reported.</p>
                       <p><span className="font-bold">Note : </span> Heart sounds regular. No new murmurs. Clear breath sounds bilaterally</p>
                    </div>
                </div>

                {/* Pain Prediction History */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                   <h3 className="font-bold text-gray-900 mb-6">Pain Prediction History</h3>
                   <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                      {/* Dynamic History List */}
                      {(() => {
                          let historyList = [];
                          if (patientData?.["Device no"]) {
                                Object.values(patientData["Device no"]).forEach(device => {
                                    if (device.prediction_history) {
                                        historyList.push(...Object.values(device.prediction_history));
                                    }
                                });
                          }
                          historyList = historyList.filter(h => h.painlevel == 1);
                          historyList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

                          const isLatestActive = latest && latest.painlevel == 1;
                          // If active, assume the first history item corresponds to this active event (pushed on start), so skip it to avoid dupe.
                          const showHistoryFromIndex = isLatestActive ? 1 : 0;
                          const historyToShow = historyList.slice(showHistoryFromIndex);

                          return (
                            <>
                                {isLatestActive && (
                                  <div className="relative pl-6 mb-8">
                                     <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#fee2e2] border-2 border-white"></div>
                                     <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Pain</h4>
                                        <p className="text-[10px] text-gray-500">
                                            {formatTime(latest.timestamp)}
                                        </p>
                                     </div>
                                  </div>
                                )}

                                {historyToShow.map((item, idx) => (
                                  <div key={idx} className="relative pl-6 mb-8">
                                     <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#fee2e2] border-2 border-white"></div>
                                     <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Pain</h4>
                                        <p className="text-[10px] text-gray-500">
                                            {formatTime(item.timestamp)}
                                        </p>
                                     </div>
                                  </div>
                                ))}
                            </>
                          );
                      })()}

                      {/* Static History (Mockup) */}
                      {/* Event 1 */}
                      <div className="relative pl-6">
                         <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#fae8ff] border-2 border-white"></div>
                         <div>
                            <h4 className="font-bold text-gray-900 text-sm">Mild Pain</h4>
                            <p className="text-[10px] text-gray-500">November 26, 2025 at 6:00:00 AM </p>
                         </div>
                      </div>
                       {/* Event 2 */}
                      <div className="relative pl-6">
                         <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#fef3c7] border-2 border-white"></div>
                         <div>
                            <h4 className="font-bold text-gray-900 text-sm">Moderate Pain</h4>
                            <p className="text-[10px] text-gray-500">November 25, 2025 at 7:50:26 PM </p>
                         </div>
                      </div>
                       {/* Event 3 */}
                      <div className="relative pl-6">
                         <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#fee2e2] border-2 border-white"></div>
                         <div>
                            <h4 className="font-bold text-gray-900 text-sm">Severe Pain</h4>
                            <p className="text-[10px] text-gray-500">November 25, 2025 at 8:00:00 AM </p>
                         </div>
                      </div>
                   </div>
                </div>

             </div>

           </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
