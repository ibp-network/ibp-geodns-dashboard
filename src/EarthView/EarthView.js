import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiHelper from '../components/ApiHelper/ApiHelper';
import Loading from '../components/Loading/Loading';
import { getDownServices, getMemberHealth, getStatusClass } from '../utils/common';
import './EarthView.css';

const EarthView = () => {
  const navigate = useNavigate();
  const globeRef = useRef();
  const containerRef = useRef();
  const globeInstance = useRef(null);
  const [members, setMembers] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globeError, setGlobeError] = useState(null);
  const [hoveredMember, setHoveredMember] = useState(null);
  const [pinnedMember, setPinnedMember] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    loadMembersData(controller.signal);
    loadDowntimeData(controller.signal);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setPinnedMember(null);
        setHoveredMember(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const isCanceledError = (error) =>
    error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';

  const getMemberInitials = (name = '') =>
    (name.slice(0, 2) || '?').toUpperCase();

  const sanitizeLogoUrl = (logoUrl) => {
    if (!logoUrl) {
      return '';
    }

    try {
      const parsed = new URL(logoUrl, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch {}

    return '';
  };

  const createMarkerPlaceholder = (name) => {
    const placeholder = document.createElement('div');
    placeholder.className = 'member-logo-placeholder';
    placeholder.textContent = getMemberInitials(name);
    return placeholder;
  };

  const createMarkerElement = (member, status, activeLights) => {
    const el = document.createElement('div');
    el.className = 'member-marker';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';

    const container = document.createElement('div');
    container.className = `marker-container ${status}`;

    const safeLogoUrl = sanitizeLogoUrl(member.logo);
    if (safeLogoUrl) {
      const img = document.createElement('img');
      img.src = safeLogoUrl;
      img.alt = member.name || 'Member';
      img.className = 'member-logo-marker';
      img.addEventListener('error', () => {
        if (img.parentElement) {
          img.replaceWith(createMarkerPlaceholder(member.name));
        }
      }, { once: true });
      container.appendChild(img);
    } else {
      container.appendChild(createMarkerPlaceholder(member.name));
    }

    const nameLabel = document.createElement('div');
    nameLabel.className = 'member-name-label';
    nameLabel.textContent = member.name || 'Unknown';
    container.appendChild(nameLabel);

    const healthLights = document.createElement('div');
    healthLights.className = 'health-lights';
    Array.from({ length: 5 }, (_, index) => {
      const light = document.createElement('span');
      light.className = `health-light ${index < activeLights ? 'active' : 'inactive'}`;
      healthLights.appendChild(light);
      return light;
    });
    container.appendChild(healthLights);

    el.appendChild(container);
    return el;
  };

  const loadMembersData = async (signal) => {
    try {
      const response = await ApiHelper.fetchMembers({ signal });
      const membersData = Array.isArray(response.data?.members)
        ? response.data.members
        : Array.isArray(response.data)
          ? response.data
          : [];
      setMembers(membersData);
    } catch (error) {
      if (isCanceledError(error)) {
        return;
      }
      console.error('Error loading members:', error);
      setMembers([]);
    }
  };

  const loadDowntimeData = async (signal) => {
    try {
      const response = await ApiHelper.fetchCurrentDowntime({ signal });
      setDowntime(response.data || []);
      setLoading(false);
    } catch (error) {
      if (isCanceledError(error)) {
        return;
      }
      console.error('Error loading downtime:', error);
      setDowntime([]);
      setLoading(false);
    }
  };

  const getMemberOutages = (memberName) => {
    return downtime.filter(dt => dt.member_name === memberName);
  };

  const isServiceDown = (memberName, serviceName) => {
    const downServices = getDownServices(memberName, members.find(m => m.name === memberName)?.services || [], downtime);
    return downServices.has(serviceName);
  };

  const getServiceStatus = (memberName, serviceName) => {
    return isServiceDown(memberName, serviceName) ? 'offline' : 'online';
  };

  const getTotalDowntimeEvents = (memberName) => {
    const outages = getMemberOutages(memberName);
    return outages.length;
  };

  const handleClosePanel = () => {
    setPinnedMember(null);
    setHoveredMember(null);
  };

  useEffect(() => {
    if (!containerRef.current || !globeRef.current || members.length === 0 || globeError) {
      return undefined;
    }

    let disposed = false;
    let cleanup = () => {};

    const initGlobe = async () => {
      try {
        const { default: Globe } = await import('globe.gl');

        if (disposed || !containerRef.current || !globeRef.current) {
          return;
        }

        if (globeInstance.current) {
          if (globeInstance.current._destructor) {
            globeInstance.current._destructor();
          }
          globeInstance.current = null;
        }

        const container = containerRef.current;
        const preventDragStart = (e) => e.preventDefault();
        const preventSelectStart = (e) => e.preventDefault();
        container.addEventListener('dragstart', preventDragStart);
        container.addEventListener('selectstart', preventSelectStart);

        const globe = Globe()(globeRef.current)
          .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
          .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
          .showAtmosphere(true)
          .atmosphereColor('lightskyblue')
          .atmosphereAltitude(0.15)
          .pointsData(members)
          .pointLat(d => d.latitude)
          .pointLng(d => d.longitude)
          .pointRadius(0)
          .pointAltitude(0)
          .htmlElementsData(members)
          .htmlLat(d => d.latitude)
          .htmlLng(d => d.longitude)
          .htmlAltitude(0.01)
          .htmlElement(d => {
            const health = getMemberHealth(d, downtime);
            const status = getStatusClass(health);
            const activeLights = Math.ceil(health / 20);
            const el = createMarkerElement(d, status, activeLights);

            el.onmouseenter = () => setHoveredMember(d);
            el.onclick = (e) => {
              e.stopPropagation();
              navigate(`/members/${encodeURIComponent(d.name)}`);
            };

            return el;
          })
          .htmlTransitionDuration(1000);

        const arcs = [];
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const health1 = getMemberHealth(members[i], downtime);
            const health2 = getMemberHealth(members[j], downtime);
            const connectionProbability = (health1 + health2) / 200;

            if (Math.random() < connectionProbability * 0.8) {
              const avgHealth = (health1 + health2) / 2;
              let color;
              if (avgHealth >= 80) {
                color = ['rgba(16, 185, 129, 0.6)', 'rgba(16, 185, 129, 0.3)'];
              } else if (avgHealth >= 50) {
                color = ['rgba(245, 158, 11, 0.6)', 'rgba(245, 158, 11, 0.3)'];
              } else {
                color = ['rgba(239, 68, 68, 0.6)', 'rgba(239, 68, 68, 0.3)'];
              }

              arcs.push({
                startLat: members[i].latitude,
                startLng: members[i].longitude,
                endLat: members[j].latitude,
                endLng: members[j].longitude,
                color
              });
            }
          }
        }

        globe
          .arcsData(arcs)
          .arcColor('color')
          .arcDashLength(0.4)
          .arcDashGap(0.2)
          .arcDashAnimateTime(2000)
          .arcStroke(0.5)
          .arcAltitudeAutoScale(0.3);

        const controls = globe.controls();
        controls.autoRotate = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.75;
        controls.enableZoom = true;
        controls.zoomSpeed = 0.75;
        controls.minDistance = 150;
        controls.maxDistance = 400;

        globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);

        const handleResize = () => {
          if (containerRef.current && globeRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            globe.width(width);
            globe.height(height);
          }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        const resizeTimeout = window.setTimeout(handleResize, 100);

        globeInstance.current = globe;

        cleanup = () => {
          container.removeEventListener('dragstart', preventDragStart);
          container.removeEventListener('selectstart', preventSelectStart);
          window.removeEventListener('resize', handleResize);
          window.clearTimeout(resizeTimeout);
          if (globeInstance.current && globeInstance.current._destructor) {
            globeInstance.current._destructor();
          }
          globeInstance.current = null;
        };
      } catch (error) {
        if (!disposed) {
          console.error('Error initializing globe:', error);
          setGlobeError(error);
        }
      }
    };

    initGlobe();

    return () => {
      disposed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, downtime, navigate, globeError]);

 const stats = {
   total: members.length,
   operational: members.filter(m => getMemberHealth(m, downtime) === 100).length,
   degraded: members.filter(m => {
     const health = getMemberHealth(m, downtime);
     return health > 0 && health < 100;
   }).length,
   offline: members.filter(m => getMemberHealth(m, downtime) === 0).length
 };

 const displayMember = pinnedMember || hoveredMember;
 const globeErrorMessage = globeError instanceof Error
   ? globeError.message
   : String(globeError || 'Unknown graphics initialization error');
 const fallbackMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));
 const earthHeader = (
   <div className="earth-header">
     <h1>Global Infrastructure Map</h1>
     <div className="status-summary enhanced-glass">
       <div className="status-item">
         <span className="status-indicator status-online"></span>
         <span className="status-label">{stats.operational} Operational</span>
       </div>
       <div className="status-item">
         <span className="status-indicator status-warning"></span>
         <span className="status-label">{stats.degraded} Degraded</span>
       </div>
       <div className="status-item">
         <span className="status-indicator status-offline"></span>
         <span className="status-label">{stats.offline} Offline</span>
       </div>
     </div>
   </div>
 );

 if (loading) {
   return <Loading pageLevel={true} dataReady={false} />;
 }

 if (globeError) {
   return (
     <div className="earth-view fade-in">
       <div className="globe-container earth-fallback">
         {earthHeader}
         <div className="earth-fallback-content">
           <div className="earth-fallback-card enhanced-glass">
             <h2>3D Globe Unavailable</h2>
             <p>
               This browser could not initialize the 3D globe view. This can happen on
               some Firefox configurations when advanced graphics features, drivers, or
               hardware acceleration are unavailable.
             </p>
             <div className="earth-fallback-actions">
               <button
                 type="button"
                 className="earth-fallback-button primary"
                 onClick={() => setGlobeError(null)}
               >
                 Retry 3D View
               </button>
               <button
                 type="button"
                 className="earth-fallback-button"
                 onClick={() => navigate('/members')}
               >
                 Open Members View
               </button>
             </div>
             <div className="earth-fallback-technical">
               Technical details: {globeErrorMessage}
             </div>
           </div>

           <div className="earth-fallback-list enhanced-glass">
             <h3>Member Quick Access</h3>
             <div className="earth-fallback-members">
               {fallbackMembers.map((member) => {
                 const health = getMemberHealth(member, downtime);
                 const status = getStatusClass(health);
                 return (
                   <button
                     key={member.name}
                     type="button"
                     className={`earth-fallback-member ${status}`}
                     onClick={() => navigate(`/members/${encodeURIComponent(member.name)}`)}
                   >
                     <span className="earth-fallback-member-name">{member.name}</span>
                     <span className="earth-fallback-member-meta">
                       {member.region} · {health.toFixed(0)}%
                     </span>
                   </button>
                 );
               })}
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className="earth-view fade-in">
     <div className="globe-container" ref={containerRef}>
       <div className="globe-wrapper">
         <div ref={globeRef} className="globe"></div>
       </div>

       {earthHeader}

       <div
         ref={panelRef}
         className={`member-info-panel enhanced-glass ${displayMember ? 'visible' : ''} ${pinnedMember ? 'pinned' : ''}`}
       >
         {displayMember && (
           <>
             <div className="panel-close-btn" onClick={handleClosePanel}>✕</div>
             <div className="panel-header">
               {displayMember.logo ? (
                 <img src={displayMember.logo} alt={displayMember.name} className="panel-logo" />
               ) : (
                 <div className="panel-logo logo-placeholder">
                   {displayMember.name.substring(0, 2).toUpperCase()}
                 </div>
               )}
               <div className="panel-title">
                 <div className="panel-name">{displayMember.name}</div>
                 <div className="panel-region">{displayMember.region}</div>
               </div>
             </div>
             <div className="panel-content">
               <div className="info-section">
                 <h3 className="section-title">Member Information</h3>
                 <div className="info-grid compact">
                   <div className="info-row">
                     <span className="info-label">Health:</span>
                     <span className="info-value">{getMemberHealth(displayMember, downtime).toFixed(0)}%</span>
                   </div>
                   <div className="info-row">
                     <span className="info-label">Level:</span>
                     <span className="info-value">{displayMember.level}</span>
                   </div>
                   <div className="info-row">
                     <span className="info-label">IPv4:</span>
                     <span className="info-value">{displayMember.service_ipv4 || 'N/A'}</span>
                   </div>
                   <div className="info-row">
                     <span className="info-label">IPv6:</span>
                     <span className="info-value">{displayMember.service_ipv6 || 'N/A'}</span>
                   </div>
                   <div className="info-row">
                     <span className="info-label">Location:</span>
                     <span className="info-value">{displayMember.latitude?.toFixed(2)}, {displayMember.longitude?.toFixed(2)}</span>
                   </div>
                   <div className="info-row">
                    <span className="info-label">Events:</span>
                    <span className="info-value">{getTotalDowntimeEvents(displayMember.name)}</span>
                   </div>
                   <div className="info-row full-width">
                     <span className="info-label">Website:</span>
                     <a href={displayMember.website} target="_blank" rel="noopener noreferrer" className="info-value link">
                       {displayMember.website?.replace(/^https?:\/\//, '')}
                     </a>
                   </div>
                 </div>
               </div>

               {getMemberOutages(displayMember.name).length > 0 && (
                 <div className="active-events">
                   <div className="active-events-title">Active Events</div>
                   {getMemberOutages(displayMember.name).slice(0, 3).map((outage, idx) => (
                     <div key={idx} className="event-item">
                       <span className="event-type">{outage.check_type}:</span>
                       <span>{outage.domain_name || outage.endpoint || 'Site level issue'}</span>
                     </div>
                   ))}
                   {getMemberOutages(displayMember.name).length > 3 && (
                     <div className="event-item">
                       <span>...and {getMemberOutages(displayMember.name).length - 3} more</span>
                     </div>
                   )}
                 </div>
               )}

               {displayMember.services && displayMember.services.length > 0 && (
                 <div className="info-section">
                   <h3 className="section-title">Active Services</h3>
                   <div className="services-grid">
                     {displayMember.services.map((service, idx) => {
                       const status = getServiceStatus(displayMember.name, service);
                       return (
                         <div key={idx} className="service-item">
                           <span className="service-name">{service}</span>
                           <div className="service-status">
                             <span className={`status-dot ${status}`}></span>
                             <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}
             </div>
           </>
         )}
       </div>

       <div className="globe-controls enhanced-glass">
         <h3>Controls</h3>
         <div className="control-item">
           <span className="control-icon">🖱️</span>
           <span>Drag to rotate</span>
         </div>
         <div className="control-item">
           <span className="control-icon">👆</span>
           <span>Click member for details</span>
         </div>
         <div className="control-item">
           <span className="control-icon">🔍</span>
           <span>Scroll to zoom</span>
         </div>
       </div>

       <div className="globe-legend enhanced-glass">
         <h3>Member Status</h3>
         <div className="legend-item">
           <div className="legend-health-lights">
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light active"></span>
           </div>
           <span>100% Services Online</span>
         </div>
         <div className="legend-item">
           <div className="legend-health-lights">
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light inactive"></span>
           </div>
           <span>80% Services Online</span>
         </div>
         <div className="legend-item">
           <div className="legend-health-lights">
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light inactive"></span>
             <span className="health-light inactive"></span>
           </div>
           <span>60% Services Online</span>
         </div>
         <div className="legend-item">
           <div className="legend-health-lights">
             <span className="health-light active"></span>
             <span className="health-light active"></span>
             <span className="health-light inactive"></span>
             <span className="health-light inactive"></span>
             <span className="health-light inactive"></span>
           </div>
           <span>40% Services Online</span>
         </div>
         <div className="legend-item">
           <div className="legend-health-lights">
             <span className="health-light active"></span>
             <span className="health-light inactive"></span>
             <span className="health-light inactive"></span>
             <span className="health-light inactive"></span>
             <span className="health-light inactive"></span>
           </div>
           <span>20% Services Online</span>
         </div>
       </div>
     </div>
   </div>
 );
};

export default EarthView;