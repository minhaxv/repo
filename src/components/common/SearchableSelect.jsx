import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  X,
  Check,
  Plus,
  User,
  Package,
  UserCheck,
  TrendingUp,
  Building2,
  Palette,
  CreditCard,
  Phone,
  Hash,
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react';

/**
 * Universal Reusable Searchable Dropdown / Combobox for ScreenArts ERP
 *
 * Supports instant search by multiple fields, quick category filter tabs,
 * keyboard navigation (Up/Down/Enter/Escape), clear button, empty/loading states,
 * custom renderers, and master-data presets.
 */
export const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder,
  disabled = false,
  allowClear = true,
  getOptionValue,
  getOptionLabel,
  searchFields,
  renderOption,
  renderSelected,
  onAddNew,
  addNewLabel = '+ Add New',
  icon: IconComponent,
  type = 'generic', // 'customer' | 'product' | 'salesPerson' | 'careOf' | 'vendor' | 'designer' | 'bank' | 'generic'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  style = {},
  menuStyle = {},
  maxMenuHeight = 320,
  autoFocusSearch = true,
  noResultsText = 'No matching records found.',
  badge,
  showCategoryFilters = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Default option value extractor
  const defaultGetOptionValue = useCallback((opt) => {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'object') {
      if (opt.id !== undefined) return opt.id;
      if (opt.value !== undefined) return opt.value;
      if (opt.name !== undefined) return opt.name;
      if (opt.code !== undefined) return opt.code;
    }
    return String(opt);
  }, []);

  // Default option label extractor
  const defaultGetOptionLabel = useCallback((opt) => {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'object') {
      return opt.name || opt.label || opt.title || opt.bankName || opt.productName || opt.code || String(opt.id || '');
    }
    return String(opt);
  }, []);

  const getValue = getOptionValue || defaultGetOptionValue;
  const getLabel = getOptionLabel || defaultGetOptionLabel;

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    if (value === null || value === undefined || value === '') return null;
    return (options || []).find((opt) => {
      const optVal = getValue(opt);
      const optLabel = getLabel(opt);
      return (
        optVal === value ||
        optLabel === value ||
        (typeof value === 'object' && getValue(value) === optVal) ||
        (typeof opt === 'object' && opt.id && value === opt.id) ||
        (typeof opt === 'object' && opt.name && value === opt.name)
      );
    }) || null;
  }, [options, value, getValue, getLabel]);

  // Extract unique categories if available (e.g. for products/vendors)
  const availableCategories = useMemo(() => {
    if (!showCategoryFilters || !options || options.length === 0) return [];
    const cats = new Set();
    options.forEach((opt) => {
      if (opt && typeof opt === 'object') {
        const c = opt.category || opt.productCategory || opt.type || opt.role || opt.department;
        if (c && typeof c === 'string') cats.add(c);
      }
    });
    return Array.from(cats);
  }, [options, showCategoryFilters]);

  // Determine search placeholder based on preset
  const computedSearchPlaceholder = useMemo(() => {
    if (searchPlaceholder) return searchPlaceholder;
    switch (type) {
      case 'customer':
        return 'Search customer by name, mobile, GSTIN, code...';
      case 'product':
        return 'Search product by name, SKU, category, material...';
      case 'salesPerson':
        return 'Search sales person by name, code, mobile...';
      case 'careOf':
        return 'Search referral partner by name, mobile, role...';
      case 'vendor':
        return 'Search vendor by name, category, mobile, city...';
      case 'designer':
        return 'Search designer by name, code, mobile...';
      case 'bank':
        return 'Search bank name, A/C number, IFSC, branch...';
      default:
        return 'Type to search...';
    }
  }, [searchPlaceholder, type]);

  // Default search fields based on preset type
  const effectiveSearchFields = useMemo(() => {
    if (searchFields && Array.isArray(searchFields)) return searchFields;
    switch (type) {
      case 'customer':
        return ['name', 'mobile', 'gstin', 'code', 'email', 'address', 'type', 'city'];
      case 'product':
        return ['name', 'code', 'sku', 'category', 'productCategory', 'material', 'defaultMaterial', 'unit', 'description', 'productName'];
      case 'salesPerson':
        return ['name', 'code', 'mobile', 'designation', 'department', 'role', 'email'];
      case 'careOf':
        return ['name', 'mobile', 'code', 'role', 'partnerType', 'notes'];
      case 'vendor':
        return ['name', 'code', 'mobile', 'category', 'services', 'city', 'contactPerson'];
      case 'designer':
        return ['name', 'code', 'mobile', 'designation', 'department', 'role'];
      case 'bank':
        return ['bankName', 'accountNo', 'ifsc', 'branch', 'accountName', 'upiId'];
      default:
        return ['name', 'label', 'title', 'code', 'id', 'value'];
    }
  }, [searchFields, type]);

  // Filtered options based on search query AND category tab
  const filteredOptions = useMemo(() => {
    let list = options || [];

    // Filter by Category tab if selected
    if (selectedCategory !== 'ALL') {
      list = list.filter((opt) => {
        if (!opt || typeof opt !== 'object') return true;
        const c = opt.category || opt.productCategory || opt.type || opt.role || opt.department;
        return c === selectedCategory;
      });
    }

    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return list;

    return list.filter((opt) => {
      if (opt === null || opt === undefined) return false;
      if (typeof opt === 'string' || typeof opt === 'number') {
        return String(opt).toLowerCase().includes(q);
      }

      // Check all effective search fields
      for (const field of effectiveSearchFields) {
        const val = opt[field];
        if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) {
          return true;
        }
      }

      // Also check standard label and value
      const label = getLabel(opt).toLowerCase();
      const val = String(getValue(opt)).toLowerCase();
      return label.includes(q) || val.includes(q);
    });
  }, [options, searchQuery, selectedCategory, effectiveSearchFields, getLabel, getValue]);

  // Outside click to close
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setSelectedCategory('ALL');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Auto focus search input when opening
  useEffect(() => {
    if (isOpen && autoFocusSearch) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 40);
      setHighlightedIndex(0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoFocusSearch]);

  // Keep highlighted index within bounds
  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions, highlightedIndex]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.combobox-option-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt) => {
    if (!opt) return;
    const optVal = getValue(opt);
    if (onChange) {
      onChange(opt, optVal);
    }
    setIsOpen(false);
    setSearchQuery('');
    setSelectedCategory('ALL');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange(null, '');
    }
    setSearchQuery('');
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (onAddNew && filteredOptions.length === 0) {
          onAddNew();
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setSelectedCategory('ALL');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        setSelectedCategory('ALL');
        break;
      default:
        break;
    }
  };

  // Preset default icon
  const ComputedIcon = useMemo(() => {
    if (IconComponent) return IconComponent;
    switch (type) {
      case 'customer':
        return User;
      case 'product':
        return Package;
      case 'salesPerson':
        return TrendingUp;
      case 'careOf':
        return UserCheck;
      case 'vendor':
        return Building2;
      case 'designer':
        return Palette;
      case 'bank':
        return CreditCard;
      default:
        return null;
    }
  }, [IconComponent, type]);

  // Default option item renderer based on preset type
  const renderOptionContent = (opt, isSelected) => {
    if (renderOption) {
      return renderOption(opt, { isSelected });
    }

    if (typeof opt !== 'object' || opt === null) {
      return <div>{String(opt)}</div>;
    }

    // CUSTOMER PRESET
    if (type === 'customer') {
      const outstanding = Number(opt.outstanding ?? opt.outstandingAmount ?? 0);
      const isWalkin = opt.type === 'Walk-in' || opt.type === 'Retail';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.88rem' }}>
              {opt.name || 'Unnamed Customer'}
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              {opt.code && <span className="badge badge-slate" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>{opt.code}</span>}
              {opt.type && (
                <span
                  className={`badge ${isWalkin ? 'badge-slate' : 'badge-blue'}`}
                  style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}
                >
                  {opt.type}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            {opt.mobile && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Phone size={11} color="#64748b" /> {opt.mobile}
              </span>
            )}
            {opt.gstin && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Hash size={11} color="#64748b" /> GST: <strong style={{ color: '#1e40af' }}>{opt.gstin}</strong>
              </span>
            )}
            {outstanding > 0 && (
              <span style={{ color: '#e11d48', fontWeight: 700 }}>
                Bal: ₹{outstanding.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      );
    }

    // PRODUCT PRESET
    if (type === 'product') {
      const rate = Number(opt.defaultRate ?? opt.default_rate ?? opt.sellingPrice ?? opt.rate ?? 0);
      const cost = Number(opt.estimatedCost ?? opt.estimated_cost ?? opt.costPrice ?? opt.cost ?? 0);
      const unit = opt.unit || 'Sq.Ft';
      const category = opt.category || opt.productCategory || 'Printing';
      const prodName = opt.name || opt.productName || 'Unnamed Product';

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
              <Package size={14} color="#2563eb" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 800, color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {prodName}
              </span>
            </div>
            <span className="badge badge-emerald" style={{ fontSize: '0.74rem', fontWeight: 800, padding: '0.15rem 0.45rem', flexShrink: 0 }}>
              ₹{rate.toLocaleString()} / {unit}
            </span>
          </div>
          <div style={{ fontSize: '0.73rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', paddingLeft: '1.25rem' }}>
            {category && <span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{category}</span>}
            {opt.code && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>SKU: {opt.code}</span>}
            {cost > 0 && <span>Est Cost: ₹{cost}/{unit}</span>}
            {opt.defaultMaterial && <span style={{ color: '#475569' }}>• {opt.defaultMaterial}</span>}
          </div>
        </div>
      );
    }

    // SALES PERSON PRESET
    if (type === 'salesPerson') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.88rem' }}>
              {opt.name}
            </span>
            <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
              {opt.designation || opt.role || 'Sales Executive'}
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {opt.mobile && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Phone size={11} color="#64748b" /> {opt.mobile}
              </span>
            )}
            {opt.code && <span>Code: {opt.code}</span>}
          </div>
        </div>
      );
    }

    // CARE OF / REFERRAL PARTNER PRESET
    if (type === 'careOf') {
      const commPct = Number(opt.referralCommissionPct ?? opt.referral_commission_pct ?? 5);
      const commType = opt.commissionType ?? opt.commission_type ?? 'profit';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.88rem' }}>
              {opt.name}
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
              {commPct}% {commType === 'sales' ? 'Sales' : 'Profit'} Comm
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <span>{opt.role || 'Referred Agent'}</span>
            {opt.mobile && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Phone size={11} color="#64748b" /> {opt.mobile}
              </span>
            )}
          </div>
        </div>
      );
    }

    // VENDOR / OUTSOURCE PRESET
    if (type === 'vendor') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.88rem' }}>
              {opt.name}
            </span>
            <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
              {opt.category || opt.services || 'Job Work Vendor'}
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {opt.mobile && <span>📱 {opt.mobile}</span>}
            {opt.city && <span>📍 {opt.city}</span>}
          </div>
        </div>
      );
    }

    // BANK ACCOUNT PRESET
    if (type === 'bank') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.88rem' }}>
              {opt.bankName}
            </span>
            <span className="badge badge-sky" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              A/C ...{(opt.accountNo || '').slice(-4)}
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <span>IFSC: {opt.ifsc}</span>
            {opt.branch && <span>Branch: {opt.branch}</span>}
          </div>
        </div>
      );
    }

    // GENERIC FALLBACK
    return (
      <div style={{ fontWeight: isSelected ? 800 : 600, color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.88rem' }}>
        {getLabel(opt)}
      </div>
    );
  };

  // Render selected trigger display
  const renderTriggerContent = () => {
    if (renderSelected && selectedOption) {
      return renderSelected(selectedOption);
    }

    if (selectedOption) {
      if (type === 'product') {
        const rate = selectedOption.defaultRate ?? selectedOption.default_rate ?? selectedOption.sellingPrice ?? '';
        const unit = selectedOption.unit || 'Sq.Ft';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <strong style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getLabel(selectedOption)}
            </strong>
            {rate !== '' && (
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', flexShrink: 0 }}>
                ₹{Number(rate).toLocaleString()}/{unit}
              </span>
            )}
          </div>
        );
      }
      return (
        <span style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getLabel(selectedOption)}
        </span>
      );
    }

    if (value && typeof value === 'string') {
      return (
        <span style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </span>
      );
    }

    return (
      <span style={{ color: '#94a3b8', fontWeight: 500 }}>
        {placeholder}
      </span>
    );
  };

  const isSmall = size === 'sm';

  return (
    <div
      ref={containerRef}
      className={`combobox-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        zIndex: isOpen ? 1000 : 'auto',
        ...style
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Closed Trigger Input Field */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`form-control ${isSmall ? 'form-control-sm' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          borderColor: isOpen ? '#2563eb' : '#cbd5e1',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
          padding: isSmall ? '0.35rem 0.55rem' : '0.5rem 0.75rem',
          minHeight: isSmall ? '34px' : '38px',
          gap: '0.4rem',
          borderRadius: 'var(--radius-md)',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {ComputedIcon && (
            <ComputedIcon
              size={isSmall ? 14 : 16}
              color={selectedOption ? '#2563eb' : '#64748b'}
              style={{ flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {renderTriggerContent()}
          </div>
          {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
          {allowClear && (selectedOption || value) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#e11d48'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={isSmall ? 12 : 14} />
            </button>
          )}

          <ChevronDown
            size={isSmall ? 13 : 16}
            color={isOpen ? '#2563eb' : '#64748b'}
            style={{
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </div>
      </div>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div
          className="combobox-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            border: '1px solid #94a3b8',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.12s ease-out',
            minWidth: '340px',
            maxWidth: '520px',
            width: 'max-content',
            ...menuStyle
          }}
        >
          {/* Search Header */}
          <div
            style={{
              padding: '0.6rem 0.65rem 0.45rem',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={16}
                color="#2563eb"
                style={{
                  position: 'absolute',
                  left: '12px',
                  pointerEvents: 'none'
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder={computedSearchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  paddingLeft: '34px',
                  paddingRight: searchQuery ? '30px' : '10px',
                  fontSize: '0.85rem',
                  height: '34px',
                  borderColor: '#93c5fd',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills (if categories exist) */}
            {availableCategories.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.3rem',
                  overflowX: 'auto',
                  paddingBottom: '2px',
                  whiteSpace: 'nowrap'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setHighlightedIndex(0);
                  }}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: selectedCategory === 'ALL' ? '#2563eb' : '#cbd5e1',
                    background: selectedCategory === 'ALL' ? '#2563eb' : '#ffffff',
                    color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  All ({options.length})
                </button>
                {availableCategories.map((cat) => {
                  const isCatSelected = selectedCategory === cat;
                  const catCount = options.filter(o => (o.category || o.productCategory || o.type || o.role || o.department) === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setHighlightedIndex(0);
                      }}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: isCatSelected ? '#2563eb' : '#cbd5e1',
                        background: isCatSelected ? '#2563eb' : '#ffffff',
                        color: isCatSelected ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat} ({catCount})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick "+ Add New" Action Bar if provided */}
          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                onAddNew();
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                background: '#eff6ff',
                color: '#2563eb',
                border: 'none',
                borderBottom: '1px solid #dbeafe',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
            >
              <Plus size={14} />
              <span>{addNewLabel}</span>
            </button>
          )}

          {/* Items Scroll List */}
          <div
            ref={listRef}
            style={{
              maxHeight: `${maxMenuHeight}px`,
              overflowY: 'auto',
              overscrollBehavior: 'contain'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.84rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertCircle size={20} color="#94a3b8" />
                <span>{searchQuery ? `No results for "${searchQuery}"` : noResultsText}</span>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew();
                      setIsOpen(false);
                    }}
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}
                  >
                    <Plus size={13} /> {addNewLabel}
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optVal = getValue(opt);
                const isSelected = selectedOption ? getValue(selectedOption) === optVal : value === optVal;
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={typeof opt === 'object' && opt?.id ? opt.id : `${optVal}_${index}`}
                    className="combobox-option-item"
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '0.6rem 0.85rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      backgroundColor: isHighlighted ? '#eff6ff' : isSelected ? '#f8fafc' : '#ffffff',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renderOptionContent(opt, isSelected)}
                    </div>
                    {isSelected && (
                      <Check size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer count indicator */}
          <div
            style={{
              padding: '0.4rem 0.85rem',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#fafafa',
              fontSize: '0.72rem',
              color: '#94a3b8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{filteredOptions.length} of {options.length} items</span>
            <span style={{ fontSize: '0.68rem' }}>↑↓ Navigate • Enter to select • Esc close</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
