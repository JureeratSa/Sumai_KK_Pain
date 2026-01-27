import React, { useState, useEffect } from 'react';
import './EditPatientModal.css';

const EditPatientModal = ({ isOpen, onClose, patient, onSave }) => {
    const [formData, setFormData] = useState({ ...patient });

    useEffect(() => {
        setFormData({ ...patient });
    }, [patient]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };



    const handleStatusChange = (statusType) => {
        setFormData(prev => ({
            ...prev,
            statusType: statusType,
            statusLabel: statusType === 'danger' ? 'Pain' : 'No Pain'
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Edit Patient Details</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="edit-form">
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group row">
                        <div className="half">
                            <label>Doctor</label>
                            <input
                                type="text"
                                name="doctor"
                                value={formData.doctor || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="half">
                            <label>Bed Number</label>
                            <input
                                type="text"
                                name="bedNumber"
                                value={formData.bedNumber || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Pain Status (Read Only)</label>
                        <div className="status-display-readonly">
                            <span className={`status-badge ${formData.statusType}`}>
                                {formData.statusLabel}
                            </span>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="save-btn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPatientModal;
