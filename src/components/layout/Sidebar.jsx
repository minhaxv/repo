import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { NAVIGATION_MODULES } from '../../data/sidebarConfig';
import {
  Printer,
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  isMobileOpen = false,
  setIsMobileOpen = () => {},
  isCollapsed = false,
  setIsCollapsed = () => {}
}) => {
  const { activeRole } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for expanded modules & favorites with localStorage persistence
  const [expandedModules, setExpandedModules] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_expanded_modules');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse expanded modules:', e);
    }
    // Default: find module containing activeTab and expand it
    const parentMod = NAVIGATION_MODULES.find(m => 
      m.id === activeTab || m.subItems?.some(s => s.id === activeTab)
    );
    return parentMod ? [parentMod.id] : ['sales'];
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_sidebar_favorites');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse favorites:', e);
    }
    return ['sales-orders', 'production', 'inventory'];
  });

  // Settings option check for multi-expand
  const [allowMultiExpand, setAllowMultiExpand] = useState(() => {
    return localStorage.getItem('erp_sidebar_multi_expand') === 'true';
  });

  // Keep multi-expand sync with window storage events
  useEffect(() => {
    const handleStorageChange = () => {
      setAllowMultiExpand(localStorage.getItem('erp_sidebar_multi_expand') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ERP_SETTINGS_CHANGED', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ERP_SETTINGS_CHANGED', handleStorageChange);
    };
  }, []);

  // Save expanded modules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('erp_expanded_modules', JSON.stringify(expandedModules));
    } catch (e) {
      console.error('Error saving expanded modules:', e);
    }
  }, [expandedModules]);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('erp_sidebar_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error('Error saving favorites:', e);
    }
  }, [favorites]);

  // Auto-expand module containing current activeTab when activeTab changes
  useEffect(() => {
    const activeModule = NAVIGATION_MODULES.find(m =>
      m.subItems?.some(s => s.id === activeTab)
    );
    if (activeModule && !expandedModules.includes(activeModule.id)) {
      if (allowMultiExpand) {
        setExpandedModules(prev => [...prev, activeModule.id]);
      } else {
        setExpandedModules([activeModule.id]);
      }
    }
  }, [activeTab, allowMultiExpand]);

  // Toggle Module open/close state
  const handleToggleModule = (moduleId) => {
    if (expandedModules.includes(moduleId)) {
      setExpandedModules(prev => prev.filter(id => id !== moduleId));
    } else {
      if (allowMultiExpand) {
        setExpandedModules(prev => [...prev, moduleId]);
      } else {
        // Auto-collapse previous modules (Accordion mode)
        setExpandedModules([moduleId]);
      }
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (e, itemId) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // Filter modules and subItems based on active user role
  const visibleModules = useMemo(() => {
    return NAVIGATION_MODULES.map(mod => {
      const isModVisible = !mod.roles || mod.roles.includes(activeRole);
      if (!isModVisible) return null;

      const filteredSubItems = mod.subItems
        ? mod.subItems.filter(sub => !sub.roles || sub.roles.includes(activeRole))
        : [];

      if (mod.subItems && mod.subItems.length > 0 && filteredSubItems.length === 0) {
        return null; // Hide module if user has no permission for any of its sub-items
      }

      return {
        ...mod,
        subItems: filteredSubItems
      };
    }).filter(Boolean);
  }, [activeRole]);

  // Flat lookup for all visible sub-items (used for search & favorites)
  const allSubItemsMap = useMemo(() => {
    const map = new Map();
    visibleModules.forEach(mod => {
      if (mod.subItems && mod.subItems.length > 0) {
        mod.subItems.forEach(sub => {
          map.set(sub.id, { ...sub, moduleLabel: mod.label });
        });
      } else {
        map.set(mod.id, { id: mod.id, label: mod.label, icon: mod.icon, moduleLabel: mod.label });
      }
    });
    return map;
  }, [visibleModules]);

  // Favorite items resolved list
  const favoriteItems = useMemo(() => {
    return favorites
      .map(id => allSubItemsMap.get(id))
      .filter(Boolean);
  }, [favorites, allSubItemsMap]);

  // Search filtering logic
  const isSearchActive = searchQuery.trim().length > 0;
  const filteredModules = useMemo(() => {
    if (!isSearchActive) return visibleModules;
    const query = searchQuery.toLowerCase().trim();

    return visibleModules.map(mod => {
      const modMatch = mod.label.toLowerCase().includes(query);
      const matchedSubs = mod.subItems?.filter(sub =>
        sub.label.toLowerCase().includes(query) || modMatch
      );

      if (modMatch || (matchedSubs && matchedSubs.length > 0)) {
        return {
          ...mod,
          subItems: matchedSubs || mod.subItems
        };
      }
      return null;
    }).filter(Boolean);
  }, [visibleModules, searchQuery, isSearchActive]);

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close Mobile Sidebar"
        />
      )}

      <aside
        className={`sidebar-shell ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand Header */}
        <div className="sidebar-brand-header">
          <div className="sidebar-brand-logo">
            <Printer size={20} />
          </div>
          
          {!isCollapsed && (
            <div className="sidebar-brand-text">
              <h1 className="sidebar-brand-title">
                ScreenArts<span>ERP</span>
              </h1>
              <span className="sidebar-brand-subtitle">
                Signage & Print Edition
              </span>
            </div>
          )}

          {/* Desktop Toggle Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="sidebar-collapse-btn desktop-only"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="sidebar-collapse-btn mobile-only"
            title="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Search Input */}
        {!isCollapsed && (
          <div className="sidebar-search-container">
            <div className="sidebar-search-wrapper">
              <Search size={14} className="sidebar-search-icon" />
              <input
                type="text"
                placeholder="Search modules & pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="sidebar-search-clear"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Content */}
        <nav className="sidebar-nav-container">
          {/* FAVORITES SECTION */}
          {!isCollapsed && !isSearchActive && favoriteItems.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <Star size={12} className="sidebar-fav-star-icon" />
                <span>FAVORITES</span>
              </div>

              {favoriteItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`fav-${item.id}`}
                    onClick={() => handleNavigate(item.id)}
                    className={`sidebar-sub-item-btn fav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} className="sidebar-item-icon" />
                    <span className="sidebar-item-label">{item.label}</span>
                    <span
                      onClick={(e) => handleToggleFavorite(e, item.id)}
                      className="sidebar-star-btn pinned"
                      title="Unpin from Favorites"
                    >
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* MAIN MODULES SECTION */}
          <div className="sidebar-section">
            {!isCollapsed && (
              <div className="sidebar-section-header">
                <span>MAIN MODULES</span>
              </div>
            )}

            {filteredModules.map((mod) => {
              const Icon = mod.icon;
              const hasSubItems = mod.subItems && mod.subItems.length > 0;
              const isExpanded = isSearchActive || expandedModules.includes(mod.id);
              
              // Check if any sub-item of this module is currently active
              const isChildActive = hasSubItems && mod.subItems.some(s => s.id === activeTab);
              const isDirectActive = !hasSubItems && activeTab === mod.id;
              const isActive = isChildActive || isDirectActive;

              if (!hasSubItems) {
                // Direct link module (e.g. Dashboard)
                return (
                  <button
                    key={mod.id}
                    onClick={() => handleNavigate(mod.id)}
                    className={`sidebar-module-btn ${isActive ? 'active' : ''}`}
                    title={isCollapsed ? mod.label : undefined}
                  >
                    <Icon size={18} className="sidebar-item-icon" />
                    {!isCollapsed && (
                      <span className="sidebar-module-label">{mod.label}</span>
                    )}
                  </button>
                );
              }

              return (
                <div key={mod.id} className={`sidebar-module-group ${isExpanded ? 'expanded' : ''}`}>
                  {/* Module Header Button with Expand Arrow (▶ / ▼) */}
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                        setExpandedModules([mod.id]);
                      } else {
                        handleToggleModule(mod.id);
                      }
                    }}
                    className={`sidebar-module-btn ${isChildActive ? 'child-active' : ''}`}
                    title={isCollapsed ? mod.label : undefined}
                  >
                    <Icon size={18} className="sidebar-item-icon" />
                    {!isCollapsed && (
                      <>
                        <span className="sidebar-module-label">{mod.label}</span>
                        <div className="sidebar-chevron-arrow">
                          {isExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </div>
                      </>
                    )}
                  </button>

                  {/* Sub-items List */}
                  {!isCollapsed && isExpanded && (
                    <div className="sidebar-sub-items-container">
                      {mod.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeTab === sub.id;
                        const isFav = favorites.includes(sub.id);

                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleNavigate(sub.id)}
                            className={`sidebar-sub-item-btn ${isSubActive ? 'active' : ''}`}
                          >
                            <SubIcon size={15} className="sidebar-item-icon" />
                            <span className="sidebar-item-label">{sub.label}</span>
                            {sub.highlight && !isSubActive && (
                              <span className="sidebar-dot-highlight" />
                            )}
                            <span
                              onClick={(e) => handleToggleFavorite(e, sub.id)}
                              className={`sidebar-star-btn ${isFav ? 'pinned' : ''}`}
                              title={isFav ? "Unpin from Favorites" : "Pin to Favorites"}
                            >
                              <Star
                                size={13}
                                fill={isFav ? "#f59e0b" : "none"}
                                color={isFav ? "#f59e0b" : "#475569"}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredModules.length === 0 && !isCollapsed && (
              <div className="sidebar-empty-search">
                No matching modules found for "{searchQuery}"
              </div>
            )}
          </div>
        </nav>

        {/* Footer Info */}
        {!isCollapsed && (
          <div className="sidebar-footer">
            <div className="sidebar-footer-info">
              <Sparkles size={13} color="#3b82f6" />
              <span>v2.4 Production Cloud</span>
            </div>
            <span className="sidebar-currency-badge">INR ₹</span>
          </div>
        )}
      </aside>
    </>
  );
};
