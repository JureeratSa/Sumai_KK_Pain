import React from 'react';
// import './PatientCard.css';

const PatientCard = ({ patient, onEdit, onClick }) => {
    return (
        <div className="patient-card" onClick={onClick} style={{ cursor: 'pointer' }}>
            <div className="card-section id-section">
                <div className="patient-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <span className="patient-id">{patient.id}</span>
            </div>

            <div className="card-section info-section">
                <h3 className="patient-name">{patient.name}</h3>
                <span className="patient-gender">{patient.gender}</span>
            </div>

            <div className="card-section doctor-section">
                <span className="doctor-name">{patient.doctor}</span>
            </div>

            <div className="card-section equipment-section">
                <div className="equipment-item">
                    <span className="label">Number Device:</span>
                    <span className="value">{patient.deviceNumber}</span>
                </div>
                <div className="equipment-item">
                    <span className="label">Number Bed:</span>
                    <span className="value">{patient.bedNumber}</span>
                </div>
            </div>

            <div className="card-section status-section">
                <span className={`status-badge ${patient.statusType}`}>
                    {patient.statusLabel}
                </span>
            </div>

            <div className="card-section action-section">
                <button className="edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
            </div>
        </div>
    );
};

export default PatientCard;
