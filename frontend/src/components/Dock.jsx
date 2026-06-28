/**
 * Dock — React Bits-style macOS dock with framer-motion magnification
 * Place at bottom of screen. All navigation lives here.
 * Props:
 *   items  : [{ to, icon: ReactNode, label, badge? }]
 *   onCmd  : () => void   (open command palette)
 */
import React, { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const ICON_SIZE    = 48;
const ICON_GAP     = 10;
const MAX_SCALE    = 1.75;
const SCALE_RANGE  = 140; // px from center that magnification applies

function DockItem({ item, mouseX, index }) {
  const ref = useRef(null);

  const distance = useMotionValue(Infinity);

  const scale = useTransform(distance, [-SCALE_RANGE, 0, SCALE_RANGE], [1, MAX_SCALE, 1]);
  const scaleSpring = useSpring(scale, { mass: 0.1, stiffness: 150, damping: 12 });

  const y = useTransform(scaleSpring, [1, MAX_SCALE], [0, -(ICON_SIZE * (MAX_SCALE - 1)) / 2]);
  const ySpring = useSpring(y, { mass: 0.1, stiffness: 150, damping: 12 });

  const [hovered, setHovered] = useState(false);

  // Update distance from cursor to icon center
  React.useEffect(() => {
    return mouseX.on('change', (mx) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      distance.set(mx - center);
    });
  }, [mouseX, distance]);

  const icon = (
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
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? -4 : 4 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          background: 'rgba(10,10,18,0.92)',
          border: '1px solid rgba(74,126,200,0.25)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          color: '#E8E8F0',
          whiteSpace: 'nowrap',
          letterSpacing: '0.05em',
          backdropFilter: 'blur(8px)',
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
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'rgba(14,14,22,0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(74,126,200,0.12)',
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}>
        {item.icon}

        {/* Active dot indicator */}
        {item.active && (
          <div style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#4A7EC8',
            boxShadow: '0 0 6px #4A7EC8',
          }} />
        )}

        {/* Badge */}
        {item.badge != null && item.badge > 0 && (
          <div style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#E53E3E',
            color: '#fff',
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '1.5px solid #050505',
          }}>
            {item.badge > 99 ? '99+' : item.badge}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (item.onClick) {
    return (
      <div onClick={item.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {icon}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      {({ isActive }) => React.cloneElement(icon, {}, ...React.Children.toArray(icon.props.children).map((child, ci) => {
        if (ci === 1) {
          // inject isActive into the tile div
          return React.cloneElement(child, {
            style: {
              ...child.props.style,
              background: isActive ? 'rgba(74,126,200,0.18)' : 'rgba(14,14,22,0.75)',
              borderColor: isActive ? 'rgba(74,126,200,0.45)' : 'rgba(74,126,200,0.12)',
              boxShadow: isActive ? '0 0 20px rgba(74,126,200,0.15), inset 0 1px 0 rgba(139,184,232,0.08)' : 'none',
            }
          });
        }
        return child;
      }))}
    </NavLink>
  );
}

function DockDivider() {
  return (
    <div style={{
      width: 1,
      height: ICON_SIZE * 0.65,
      background: 'linear-gradient(to bottom, transparent, rgba(74,126,200,0.2), transparent)',
      alignSelf: 'flex-end',
      marginBottom: 6,
      flexShrink: 0,
    }} />
  );
}

export default function Dock({ items = [], dividers = [] }) {
  const mouseX = useMotionValue(Infinity);
  const dockRef = useRef(null);

  const flatItems = items.flat(); // support nested arrays for divider groups

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9990,
      display: 'flex',
      alignItems: 'flex-end',
      gap: ICON_GAP,
      padding: '10px 14px',
      background: 'rgba(8,8,14,0.72)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      borderRadius: 22,
      border: '1px solid rgba(74,126,200,0.15)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(139,184,232,0.06) inset, 0 0 0 0.5px rgba(74,126,200,0.08)',
    }}
      ref={dockRef}
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {items.map((itemOrGroup, gi) => {
        if (Array.isArray(itemOrGroup)) {
          return (
            <React.Fragment key={`group-${gi}`}>
              {gi > 0 && <DockDivider />}
              {itemOrGroup.map((item, ii) => (
                <DockItem key={item.to || item.label} item={item} mouseX={mouseX} index={ii} />
              ))}
            </React.Fragment>
          );
        }
        const item = itemOrGroup;
        return <DockItem key={item.to || item.label} item={item} mouseX={mouseX} index={gi} />;
      })}
    </div>
  );
}
