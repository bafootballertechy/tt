import zlib
import struct
import math

def create_png(width, height, get_pixel_fn, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter type 0: None
        for x in range(width):
            r, g, b, a = get_pixel_fn(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    def make_chunk(chunk_type, data):
        c_type = chunk_type.encode('ascii')
        crc = zlib.crc32(c_type + data) & 0xffffffff
        return struct.pack('>I', len(data)) + c_type + data + struct.pack('>I', crc)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    compressed_idat = zlib.compress(bytes(raw_data), 9)
    
    png = (
        b'\x89PNG\r\n\x1a\n' +
        make_chunk('IHDR', ihdr) +
        make_chunk('IDAT', compressed_idat) +
        make_chunk('IEND', b'')
    )
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Generated {filename} ({width}x{height})")

def render_tacstem_icon(x, y, w, h, is_maskable=False):
    # Normalize coordinates to 0..1
    nx = x / float(w)
    ny = y / float(h)
    
    # Background color #111115
    bg_r, bg_g, bg_b = 17, 17, 21
    
    # Margin for maskable is larger (safe zone central 80%)
    scale = 0.72 if is_maskable else 0.82
    cx, cy = 0.5, 0.5
    
    # Transform to icon space (-1 to 1 centered)
    px = (nx - cx) / (scale / 2.0)
    py = (ny - cy) / (scale / 2.0)
    
    # Distance to rounded rect border if not maskable
    if not is_maskable:
        # Rounded box
        bx = abs(nx - 0.5) * 2
        by = abs(ny - 0.5) * 2
        corner_r = 0.28
        if bx > (1 - corner_r) and by > (1 - corner_r):
            cdist = math.hypot(bx - (1 - corner_r), by - (1 - corner_r))
            if cdist > corner_r:
                return (0, 0, 0, 0) # transparent outside
    
    # Points in icon space (from SVG: 50,170 -> 95,105 -> 145,135 -> 190,75 on 240x240 box)
    # Centers in normalized -1..1:
    pts = [
        (-0.58,  0.42),  # P1
        (-0.21, -0.12),  # P2
        ( 0.21,  0.12),  # P3
        ( 0.58, -0.38)   # P4
    ]
    
    def dist_to_segment(p1, p2, px, py):
        x1, y1 = p1
        x2, y2 = p2
        dx = x2 - x1
        dy = y2 - y1
        l2 = dx*dx + dy*dy
        if l2 == 0:
            return math.hypot(px - x1, py - y1)
        t = max(0.0, min(1.0, ((px - x1)*dx + (py - y1)*dy) / l2))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        return math.hypot(px - proj_x, py - proj_y)

    # Segments
    d1 = dist_to_segment(pts[0], pts[1], px, py)
    d2 = dist_to_segment(pts[1], pts[2], px, py)
    d3 = dist_to_segment(pts[2], pts[3], px, py)
    min_line_dist = min(d1, d2, d3)
    
    # Glowing highlight at P4
    p4_dist = math.hypot(px - pts[3][0], py - pts[3][1])
    
    # Line thickness
    line_thick = 0.14
    
    # Outer glow at final node
    if p4_dist < 0.42:
        glow_factor = max(0.0, 1.0 - (p4_dist / 0.42))
        glow_alpha = glow_factor * glow_factor * 0.4
    else:
        glow_alpha = 0.0

    # Draw final white node
    if p4_dist < 0.16:
        return (255, 255, 255, 255)
        
    # Draw green nodes
    for pt in pts[:3]:
        d_pt = math.hypot(px - pt[0], py - pt[1])
        if d_pt < 0.13:
            if d_pt > 0.06:
                # Green ring
                return (198, 255, 31, 255)
            else:
                # Dark center
                return (24, 24, 28, 255)

    # Main connected line (lime green #c6ff1f)
    if min_line_dist < line_thick:
        edge = (line_thick - min_line_dist) / 0.02
        if edge > 1.0:
            return (198, 255, 31, 255)
        else:
            # anti-aliased edge
            mix = max(0.0, min(1.0, edge))
            r = int(bg_r * (1 - mix) + 198 * mix)
            g = int(bg_g * (1 - mix) + 255 * mix)
            b = int(bg_b * (1 - mix) + 31 * mix)
            return (r, g, b, 255)

    # Background with subtle glow
    if glow_alpha > 0:
        r = int(min(255, bg_r + glow_alpha * 200))
        g = int(min(255, bg_g + glow_alpha * 240))
        b = int(min(255, bg_b + glow_alpha * 120))
        return (r, g, b, 255)

    return (bg_r, bg_g, bg_b, 255)

create_png(192, 192, lambda x,y,w,h: render_tacstem_icon(x,y,w,h, False), 'public/pwa-192x192.png')
create_png(512, 512, lambda x,y,w,h: render_tacstem_icon(x,y,w,h, False), 'public/pwa-512x512.png')
create_png(512, 512, lambda x,y,w,h: render_tacstem_icon(x,y,w,h, True), 'public/pwa-maskable-512x512.png')
create_png(180, 180, lambda x,y,w,h: render_tacstem_icon(x,y,w,h, False), 'public/apple-touch-icon.png')
