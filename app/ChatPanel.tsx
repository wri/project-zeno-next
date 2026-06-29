"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";
import ChatPanelCompact from "./ChatPanelCompact";
import ChatPanelFullSize from "./ChatPanelFullSize";
import useSidebarStore from "./store/sidebarStore";

// [PROTOTYPE] Floating compact panel
// ─────────────────────────────────────────────────────────────────────────────
// The compact panel is rendered as a `position:fixed` framer-motion element
// so it can be freely dragged anywhere on screen, independent of the normal
// flex layout used by the full-size panel.
//
// Key decisions:
//  • `dragListener={false}` + `dragControls` — drag only starts when the user
//    grabs the explicit handle in ChatPanelHeader, not by clicking anywhere on
//    the panel.
//  • `useMotionValue` for x/y — lets us read the current position imperatively
//    in onDragEnd and animate it back to 0 via framer-motion's spring without
//    triggering a re-render on every frame.
//  • `constraintRef` div — a transparent fixed overlay whose bounding box
//    framer-motion uses to clamp the drag. Its top is offset by the page-header
//    height (40px) so the panel header can never slide behind the page header.
//  • `isChatPanelAtHome` in sidebarStore — shared flag that MapAreaControls
//    reads to reposition the zoom/basemap controls when the panel moves away
//    from its default left-anchored position.
// ─────────────────────────────────────────────────────────────────────────────

// If the panel is released within this many px of its home position (x=0),
// spring it back to the default bottom-left corner.
const SNAP_THRESHOLD_PX = 120;

function ChatPanel() {
  const [isFullSize, setIsFullSize] = useState(false);
  const { setChatFullSize, setChatPanelAtHome } = useSidebarStore();

  // dragControls is passed down to ChatPanelHeader so only the drag-handle
  // icon triggers a drag, not accidental clicks on buttons or text.
  const dragControls = useDragControls();

  // x/y are framer-motion MotionValues — they drive the CSS transform applied
  // on top of the fixed bottom/left CSS position. Reset to 0 = panel is home.
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transparent full-viewport div. framer-motion measures its bounding box on
  // each drag start and uses it to clamp the element's transform range.
  const constraintRef = useRef<HTMLDivElement>(null);

  const toggleSize = () => {
    setIsFullSize((prev) => {
      const next = !prev;
      if (next) {
        // Switching to full-size: reset position so that switching back to
        // compact always starts from the default bottom-left corner.
        x.set(0);
        y.set(0);
        setChatPanelAtHome(true);
      }
      setChatFullSize(next);
      return next;
    });
  };

  // Tell MapAreaControls to move the zoom/basemap stack to the left edge as
  // soon as a drag begins — so they don't sit behind a dragged panel.
  const handleDragStart = () => {
    setChatPanelAtHome(false);
  };

  // On release, snap back if the panel is still close to its home column.
  // If it's been dragged further away the user intentionally repositioned it,
  // so we leave it in place (controls stay left-anchored via isChatPanelAtHome).
  const handleDragEnd = () => {
    if (Math.abs(x.get()) < SNAP_THRESHOLD_PX) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
      animate(y, 0, { type: "spring", stiffness: 400, damping: 40 });
      setChatPanelAtHome(true);
    }
  };

  return (
    <>
      {/* Drag boundary — covers the viewport below the 40px page header.
          framer-motion computes allowed transform ranges from this rect, so
          the panel header can never overlap the page header. */}
      <div
        ref={constraintRef}
        style={{
          position: "fixed",
          top: 40, // page header height — update if PageHeader h changes
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <AnimatePresence mode="wait">
        {isFullSize ? (
          <motion.div
            key="fullsize"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: "1 1 auto",
              minHeight: 0,
              height: "100%",
            }}
          >
            <ChatPanelFullSize onToggleSize={toggleSize} />
          </motion.div>
        ) : (
          // [PROTOTYPE] The compact panel escapes the normal flex layout by
          // using position:fixed. The x/y MotionValues are applied as a CSS
          // transform on top of the static bottom/left anchoring, so:
          //   • at rest  → panel sits at bottom:8px, left:12px
          //   • dragging → transform:translate(x,y) offsets from that anchor
          //   • snap     → spring animation back to x=0, y=0
          <motion.div
            key="compact"
            drag
            dragControls={dragControls}
            dragListener={false} // only the handle icon starts a drag
            dragMomentum={false} // no inertia after release — feels more precise
            dragConstraints={constraintRef}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
              x,
              y,
              position: "fixed",
              bottom: 8,
              left: 12,
              zIndex: 9999, // above chart overlays (9000) and all other UI layers
              pointerEvents: "auto",
              // Prevent the browser from selecting text in the panel (and across
              // the rest of the page) while the user is dragging.
              userSelect: "none",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChatPanelCompact
              onToggleSize={toggleSize}
              dragControls={dragControls}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatPanel;
