
import React, { useState, useRef, useEffect } from 'react';
import styles from './Dropdown.module.css';

const Dropdown = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option",
  onHover = null,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleOptionHover = (option) => {
    setHoveredOption(option);
    if (onHover) {
      onHover(option);
    }
  };

  const handleOptionLeave = () => {
    setHoveredOption(null);
    if (onHover) {
      onHover(null);
    }
  };

  return (
    <div className={`${styles.dropdown} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.dropdownButton} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.dropdownValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`${styles.dropdownArrow} ${isOpen ? styles.rotated : ''}`}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`${styles.dropdownOption} ${
                value === option.value ? styles.selected : ''
              } ${hoveredOption?.value === option.value ? styles.hovered : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={() => handleOptionHover(option)}
              onMouseLeave={handleOptionLeave}
            >
              {option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
              <span className={styles.optionLabel}>{option.label}</span>
              {option.description && (
                <span className={styles.optionDescription}>{option.description}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
