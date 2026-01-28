import React from 'react';

const Header = () => {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            backgroundColor: '#dbeafe',
        }}>
            <div className="menu-icon" style={{ cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </div>

            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="icon-btn" style={{ cursor: 'pointer' }}>
                    <img src="https://cdn-icons-png.flaticon.com/512/3222/3222624.png" alt="History" width="24" />
                </div>
                <div className="icon-btn" style={{ cursor: 'pointer' }}>
                    <img src="https://cdn-icons-png.flaticon.com/512/3602/3602145.png" alt="Notifications" width="24" />
                </div>
                <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' }}>
                    <div className="avatar-circle" style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <div className="user-info" style={{ textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold' }}>ICU</span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#666' }}>Admin</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
