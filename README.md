# Partner Play ❤️ — Real-Time Canvas & Synchronized Beats

A shared, low-latency web application designed for couples and friends to draw together simultaneously while listening to perfectly synchronized music.

---

## Architecture Overview

1. **Real-Time Signaling & Relay**:
   - Built on Node.js and Socket.IO.
   - Dynamic 6-character room codes (`LOVE99`, `PAIR38`, etc.) with in-memory state persistence (stroke history, playhead tracking, members, and notes).
   - Clock-drift compensated timestamp relays with sub-250ms threshold.

2. **Collaborative Vector Canvas Engine**:
   - **Coordinate Normalization**: Transmits relative float coordinates $(x, y \in [0.0, 1.0])$, ensuring identical scaling across phones, tablets, and wide monitors.
   - **Vector Smoothing**: Quadratic Bezier curve interpolation for smooth brush strokes.
   - **Stroke Batching**: `requestAnimationFrame` throttled emission to avoid network flood.
   - **Tools**: Normal Brush, Neon Glow Pen, Highlighter, Eraser, Love Stamps/Stickers, Undo, Clear, and PNG export with watermark.
   - **Live Partner Cursor**: Real-time visualization of partner's pen location, user avatar, and drawing indicator.

3. **Synchronized Audio Engine**:
   - **YouTube IFrame Player API** (supports custom URLs and curated chill/lofi stations).
   - **Built-in HTML5 Ambient Streams** (guaranteed 100% playable lofi/acoustic/piano tracks).
   - **Clock Drift Formula**:
     $$\text{targetTime} = \text{currentTime} + \frac{\text{now}() - \text{sentAt}}{1000}$$
   - **250ms Threshold**: Micro-drifts (<250ms) are kept smooth without audio clicks; hard seeks occur only on true drifts.

4. **Couple Interactions**:
   - **Floating Live Reactions**: Bursting hearts, kisses, magic sparkles, party confetti animations.
   - **Whisper Notes Drawer**: Shared sticky notes for leaving sweet messages and love letters.

---

## Quickstart

### 1. Run Backend Server
```bash
cd "partner play/server"
node index.js
```
The server starts on `http://localhost:5000` (and serves the pre-built SPA client).

### 2. Run Client in Dev Mode (with Hot Reload)
```bash
cd "partner play/client"
npm run dev
```
Access at `http://localhost:5173/`.

### 3. Share with Partner
- Send your partner the 6-character room code (e.g. `PAIR38`) or the direct link:
  `http://<your-ip-or-host>:5173/?room=PAIR38`
- Both devices will be paired instantly with zero setup!
