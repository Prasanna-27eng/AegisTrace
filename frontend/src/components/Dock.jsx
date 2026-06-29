import React, { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const ICON_SIZE   = 44;
const ICON_GAP    = 6;
const MAX_SCALE   = 1.45;
const SCALE_RANGE = 110;

// Cream light palette
const ICON_COLOR_INACTIVE = 'rgba(26,22,18,0.5)';
const ICON_COLOR_ACTIVE   = '#CC785C';
const TILE_BG_INACTIVE    = 'transparent';
const TILE_BG_ACTIVE      = 'rgba(204,120,92,0.1)';
const TILE_BORDER_INACTIVE = 'transparent';
const TILE_BORDER_ACTIVE  = 'rgba(204,120,92,0.22)';

function DockItem({ item, mouseX }) {
  const ref      = useRef(null);
  const distance = useMotionValue(Infinity);

  const scale       = useTransform(distance, [-SCALE_RANGE, 0, SCALE_RANGE], [1, MAX_SCALE, 1]);
  const scaleSpring = useSpring(scale, { mass: 0.08, stiffness: 180, damping: 14 });
  const y           = useTransform(scaleSpring, [1, MAX_SCALE], [0, -(ICON_SIZE * (MAX_SCALE - 1)) / 2]);
  const ySpring     = useSpring(y, { mass: 0.08, stiffness: 180, damping: 14 });

  const [hovered, setHovered] = useState(false);

  React.useEffect(() => {
    return mouseX.on('change', (mx) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      distance.set(mx - (rect.left + rect.width / 2));
    });
  }, [mouseX, distance]);

  const renderIcon = (isActive) => (
    <motion.div
      ref={ref}
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        scale: scaleSpring,
        y: ySpring,
        position: 'relative',
        cursor: 'pointer',
        transformOrigin: 'bottom center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); distance.set(Infinity); }}
    >
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? -2 : 4 }}
        transition={{ duration: 0.12 }}
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          background: 'rgba(12,12,18,0.94)',
          border: '1px solid rgba(26,22,18,0.1)',
          borderRadius: 6,
          padding: '3px 9px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          color: '#D0D4DF',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
          backdropFilter: 'blur(12px)',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        {item.label}
      </motion.div>

      {/* Icon tile */}
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: isActive ? TILE_BG_ACTIVE : hovered ? 'rgba(26,22,18,0.05)' : TILE_BG_INACTIVE,
        border: `1px solid ${isActive ? TILE_BORDER_ACTIVE : hovered ? 'rgba(26,22,18,0.08)' : TILE_BORDER_INACTIVE}`,
        transition: 'background 0.18s, border-color 0.18s',
        color: isActive ? ICON_COLOR_ACTIVE : ICON_COLOR_INACTIVE,
      }}>
        {/* Clone icon with correct color */}
        {React.cloneElement(item.icon, {
          style: {
            ...item.icon.props.style,
            color: isActive ? ICON_COLOR_ACTIVE : hovered ? 'rgba(26,22,18,0.75)' : ICON_COLOR_INACTIVE,
            transition: 'color 0.18s',
          }
        })}

        {/* Active indicator dot */}
        {isActive && (
          <div style={{
            position: 'absolute',
            bottom: -7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#CC785C',
          }} />
        )}

        {/* Badge */}
        {item.badge != null && item.badge > 0 && (
          <div style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 15,
            height: 15,
            borderRadius: 8,
            background: '#E53E3E',
            color: '#fff',
            fontSize: 8,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '1.5px solid rgba(26,22,18,0.06)',
          }}>
            {item.badge > 99 ? '99+' : item.badge}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (item.onClick) {
    return (
      <div onClick={item.onClick} style={{ display: 'flex', alignItems: 'center' }}>
        {renderIcon(false)}
      </div>
    );
  }

  return (
    <NavLink to={item.to} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
      {({ isActive }) => renderIcon(isActive)}
    </NavLink>
  );
}

function DockDivider() {
  return (
    <div style={{
      width: 1,
      height: ICON_SIZE * 0.55,
      background: 'rgba(26,22,18,0.12)',
      alignSelf: 'flex-end',
      marginBottom: 5,
      flexShrink: 0,
    }} />
  );
}

export default function Dock({ items = [] }) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9990,
        display: 'flex',
        alignItems: 'flex-end',
        gap: ICON_GAP,
        padding: '8px 12px',
        background: 'rgba(245,240,232,0.88)',
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        borderRadius: 18,
        border: '1px solid rgba(26,22,18,0.1)',
        boxShadow: '0 8px 32px rgba(26,22,18,0.12), 0 1px 0 rgba(255,255,255,0.7) inset',
      }}
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {items.map((itemOrGroup, gi) => {
        if (Array.isArray(itemOrGroup)) {
          return (
            <React.Fragment key={`group-${gi}`}>
              {gi > 0 && <DockDivider />}
              {itemOrGroup.map((item) => (
                <DockItem key={item.to || item.label} item={item} mouseX={mouseX} />
              ))}
            </React.Fragment>
          );
        }
        return <DockItem key={itemOrGroup.to || itemOrGroup.label} item={itemOrGroup} mouseX={mouseX} />;
      })}
    </div>
  );
}
