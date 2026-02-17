"use client";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebase";
import { useParams } from "next/navigation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PatientDetail = () => {
  const { id } = useParams();
  const [patientData, setPatientData] = useState();
  const [doctorData, setDoctorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState("Now"); // Now, 1D, 1W

  useEffect(() => {
    if (!id) return;
    const patientRef = ref(db, `patient/${id}`);
    const doctorRef = ref(db, "Doctor");

    const unsubscribePatient = onValue(patientRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPatientData(data);
      }
      setLoading(false);
    });

    const unsubscribeDoctor = onValue(doctorRef, (snapshot) => {
      const doctors = snapshot.val();
      if (doctors) {
        const foundDoctor = Object.values(doctors).find(
          (doc) => doc.Patients && doc.Patients[id] === true
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

  // --- Helper Data Extraction ---
  let latest = null;

  if (patientData?.["Device no"]) {
    const devices = Object.values(patientData["Device no"]);
    // Find Latest Prediction (for Pain History & Doctor Info)
    const allPredicts = devices
      .map((d) => d.predict)
      .filter((p) => p && p.timestamp);
    if (allPredicts.length > 0) {
      allPredicts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      latest = allPredicts[0];
    }
  }

  const formatTime = (ts) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });
  };

  // --- Chart Data Processing ---
  const getChartData = (type) => {
    // type: 'HR' (PPG) or 'EDA'
    const device = patientData?.["Device no"]
      ? Object.values(patientData["Device no"])[0]
      : null;
    
    // Base data from Realtime DB (limit to last 60 for Now)
    let realData = [];
    if (device && device.data) {
       realData = Object.entries(device.data).map(([key, value]) => ({
        ts: parseInt(key),
        ...value,
      }));
      realData.sort((a, b) => a.ts - b.ts);
    }
    
    let chartDataPoints = [];
    let nowTs = Date.now() / 1000;
    
    if (chartRange === "Now") {
        // Use Real Data for "Now" (Live)
        // If empty, return empty
        if (realData.length > 0) {
            chartDataPoints = realData.slice(-60);
        } else {
            // Or just return empty to show "No Data"
             chartDataPoints = [];
        }
    } else if (chartRange === "1D") {
        // DEMO Logic for 1D: Generate simulated data points for the last 24 hours
        // Interval: 15 minutes (96 points)
        const points = 96;
        const interval = 15 * 60;
        const startTs = nowTs - (24 * 60 * 60);

        for (let i = 0; i < points; i++) {
            const ts = startTs + (i * interval);
            // Simulate Values: HR ~ 80-110 (Sick/Pain), EDA ~ 0.2-0.5
            let val = 0;
            if (type === 'HR') {
                 // Base 95 + Sine wave (daily variation) + random stress spikes
                 val = 95 + Math.sin(i / 10) * 10 + (Math.random() * 10 - 5);
            } else {
                 val = 0.3 + Math.sin(i / 15) * 0.1 + (Math.random() * 0.05 - 0.025);
            }
            chartDataPoints.push({ ts, [type === 'HR' ? 'PPG' : 'EDA']: val });
        }
    } else if (chartRange === "1W") {
        // DEMO Logic for 1W: Generate simulated data points for last 7 days
        // Interval: 4 hours (42 points)
        const points = 42;
        const interval = 4 * 60 * 60;
        const startTs = nowTs - (7 * 24 * 60 * 60);

         for (let i = 0; i < points; i++) {
            const ts = startTs + (i * interval);
            let val = 0;
            if (type === 'HR') {
                 // Base 90 + variation
                 val = 90 + Math.sin(i / 5) * 15 + (Math.random() * 10 - 5);
            } else {
                 val = 0.3 + Math.sin(i / 6) * 0.15 + (Math.random() * 0.05 - 0.025);
            }
            chartDataPoints.push({ ts, [type === 'HR' ? 'PPG' : 'EDA']: val });
        }
    }

    const labels = chartDataPoints.map((d) => {
        const date = new Date(d.ts * 1000);
        if (chartRange === 'Now') return date.toLocaleTimeString([], { hourSpace: false, hour12: false, hour: '2-digit', minute: '2-digit' });
        if (chartRange === '1D') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });

    const values = chartDataPoints.map((d) => type === 'HR' ? d.PPG : d.EDA);

    const color = type === 'HR' ? 'rgb(96, 165, 250)' : 'rgb(168, 85, 247)'; // blue-400 : purple-500
    const bgColor = type === 'HR' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(168, 85, 247, 0.1)';

    return {
      labels,
      datasets: [
        {
          label: type,
          data: values,
          borderColor: color,
          backgroundColor: bgColor,
          tension: 0.4, // Curve
          pointRadius: 0, // Hide points for clean sparkline look
          fill: true,
        },
      ],
    };
  };

  const hrChartData = useMemo(() => getChartData('HR'), [patientData, chartRange]);
  const edaChartData = useMemo(() => getChartData('EDA'), [patientData, chartRange]);

  // Calculate Realtime/Latest Values for Display
  
  // 1. Try to get Calculated Heart Rate from Backend (preprocessing/HRV)
  let backendHeartRate = 0;
  if (patientData?.["Device no"]) {
    const device = Object.values(patientData["Device no"])[0];
    if (device?.preprocessing?.HRV?.Heart_Rate) {
        backendHeartRate = device.preprocessing.HRV.Heart_Rate;
    }
  }

  // 2. Fallback or Raw PPG for Graph
  const currentPPG = hrChartData.datasets[0]?.data[hrChartData.datasets[0]?.data.length - 1] 
                     || (patientData?.["Device no"] ? Object.values(patientData["Device no"])[0]?.['1s']?.PPG : 0)
                     || 0;
                     
  // Display Logic: If backend HR is available and valid (>0), use it. 
  // Otherwise, if PPG is huge (>250), it's likely raw data, so don't show it as BPM (show '-' or backend value).
  const displayHeartRate = backendHeartRate > 0 ? backendHeartRate : (currentPPG > 250 ? "-" : currentPPG);

  const currentEDA = edaChartData.datasets[0]?.data[edaChartData.datasets[0]?.data.length - 1]
                     || (patientData?.["Device no"] ? Object.values(patientData["Device no"])[0]?.['1s']?.EDA : 0)
                     || 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { maxTicksLimit: 6, autoSkip: true, maxRotation: 0 }
      },
      y: {
        display: true,
        grid: { display: true, color: '#f3f4f6' }, // weak gray grid
        ticks: { maxTicksLimit: 5 }
      }
    },
    elements: {
        line: { borderWidth: 2 }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar - Patient Card (1/4 width) */}
        <div className="w-1/4 bg-white p-6 border-r border-gray-100 overflow-y-auto">
          {/* Profile Image & Name - Image Removed */}
          <div className="flex flex-col items-center mb-6">
            <h2 className="text-xl font-bold text-[#1e3a8a] text-center mt-4">
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
            <h3 className="text-[#1e3a8a] font-bold border-b border-gray-200 pb-2 mb-4">
              Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Bed no.</span>
                <span className="font-bold text-gray-800">
                  {patientData?.["Bad no"] ||
                    patientData?.["Bed no"] ||
                    patientData?.Room ||
                    "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Age</span>
                <span className="font-bold text-gray-800">
                  {patientData?.Age || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gender</span>
                <span className="font-bold text-gray-800">
                  {patientData?.Gender || patientData?.Sex || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Blood group</span>
                <span className="font-bold text-gray-800">
                  {patientData?.["Blood group"] || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Height (cm)</span>
                <span className="font-bold text-gray-800">
                  {patientData?.Heigh || patientData?.Height || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Weight(kg)</span>
                <span className="font-bold text-gray-800">
                  {patientData?.Weight || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">BMI(kg/m2)</span>
                <span className="font-bold text-gray-800">
                  {patientData?.BMI || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Admission Date</span>
                <span className="font-bold text-gray-800">
                  {patientData?.["Admission Date"] || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Device no.</span>
                <span className="font-bold text-gray-800">
                  {patientData?.["Assigned_Device_ID"] || "-"}
                </span>
              </div>
            </div>
          </div>



          {/* Allergies */}
          <div className="mb-6">
            <h3 className="text-[#1e3a8a] font-bold border-b border-gray-200 pb-2 mb-2">
              Allergies
            </h3>
            <ul className="list-disc pl-5 text-sm font-bold text-gray-800">
              {patientData?.Allergies ? (
                Array.isArray(patientData.Allergies) ? (
                  patientData.Allergies.map((allergy, i) => (
                    <li key={i}>{allergy}</li>
                  ))
                ) : (
                  <li>{patientData.Allergies}</li>
                )
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
                        {patientData?.["Device no"] ? formatTime(Date.now()) : "No data"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded p-0.5">
                      {['Now', '1D', '1W'].map((range) => (
                          <button 
                            key={range}
                            onClick={() => setChartRange(range)}
                            className={`px-2 py-0.5 text-xs font-bold rounded ${chartRange === range ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
                          >
                            {range}
                          </button>
                      ))}
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-blue-500" style={{color: 'rgb(96, 165, 250)'}}>
                        {displayHeartRate !== "-" ? Math.round(displayHeartRate) : "-"} bmp
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Current Heart Rate
                      </span>
                    </div>
                  </div>
                </div>
                {/* Real Chart */}
                <div className="h-80 w-full">
                     <Line options={chartOptions} data={hrChartData} />
                </div>
              </div>

              {/* EDA Chart */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Electrodermal activity
                    </h3>
                    <p className="text-xs text-gray-500">
                        {patientData?.["Device no"] ? formatTime(Date.now()) : "No data"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="flex bg-gray-100 rounded p-0.5">
                      {['Now', '1D', '1W'].map((range) => (
                          <button 
                            key={range}
                            onClick={() => setChartRange(range)}
                            className={`px-2 py-0.5 text-xs font-bold rounded ${chartRange === range ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
                          >
                            {range}
                          </button>
                      ))}
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-blue-500" style={{color: 'rgb(168, 85, 247)'}}>
                        {Number(currentEDA).toFixed(2)} mu
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Average
                      </span>
                    </div>
                  </div>
                </div>
                {/* Real Chart */}
                <div className="h-80 w-full">
                     <Line options={chartOptions} data={edaChartData} />
                </div>
              </div>


            </div>

            {/* Right Column (Doctor & Pain History) */}
            <div className="col-span-1 space-y-6">
              {/* Doctor Card */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  {/* Image Removed */}
                  <div>
                    <h3 className="font-bold text-[#1e3a8a] text-lg">
                      {doctorData?.name ||
                        patientData?.Doctor_name ||
                        "Jane Dhoe"}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold">
                      {doctorData?.specialist || "Cardiologist"}
                    </p>
                    <p className="text-xs text-blue-500">
                      {patientData?.name
                        ? `${patientData.name.split(" ")[0]}'s Doctor`
                        : "Patient's Doctor"}
                    </p>
                  </div>
                </div>

              </div>

              {/* Pain Prediction History */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6">
                  Pain Prediction History
                </h3>
                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                  {/* Dynamic History List */}
                  {(() => {
                    let historyList = [];
                    if (patientData?.["Device no"]) {
                      Object.values(patientData["Device no"]).forEach(
                        (device) => {
                          if (device.prediction_history) {
                            historyList.push(
                              ...Object.values(device.prediction_history)
                            );
                          }
                        }
                      );
                    }
                    historyList = historyList.filter((h) => h.painlevel == 1);
                    historyList.sort((a, b) =>
                      b.timestamp.localeCompare(a.timestamp)
                    );

                    const isLatestActive = latest && latest.painlevel == 1;
                    const showHistoryFromIndex = isLatestActive ? 1 : 0;
                    const historyToShow = historyList.slice(
                      showHistoryFromIndex
                    );

                    return (
                      <>
                        {isLatestActive && (
                          <div className="relative pl-6 mb-8">
                            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#fee2e2] border-2 border-white"></div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">
                                Pain
                              </h4>
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
                              <h4 className="font-bold text-gray-900 text-sm">
                                Pain
                              </h4>
                              <p className="text-[10px] text-gray-500">
                                {formatTime(item.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}


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
