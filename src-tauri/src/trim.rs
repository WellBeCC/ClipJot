use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct TrimBounds {
    pub top: u32,
    pub right: u32,
    pub bottom: u32,
    pub left: u32,
}

/// Detect uniform-color borders on an RGBA image.
///
/// Scans each edge inward from the border, checking if all pixels
/// in each row/column are within the threshold of the corner pixel.
/// Uses early termination — stops scanning an edge as soon as a
/// non-border pixel is found.
///
/// # Arguments
/// * `pixels` - Raw RGBA pixel data (4 bytes per pixel)
/// * `width` - Image width in pixels
/// * `height` - Image height in pixels
/// * `threshold` - Per-channel tolerance (0-255, default 10)
///
/// # Returns
/// Number of pixels to trim from each edge, or zero on all sides
/// if content would be smaller than 10×10.
pub fn detect_trim_bounds(pixels: &[u8], width: u32, height: u32, threshold: u8) -> TrimBounds {
    let zero = TrimBounds {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    };

    let w = width as usize;
    let h = height as usize;
    let thresh = threshold as i16;

    // Edge case: too small to trim
    if w < 10 || h < 10 {
        return zero;
    }

    // Reference color: top-left corner pixel (RGBA, ignore alpha)
    let ref_r = pixels[0] as i16;
    let ref_g = pixels[1] as i16;
    let ref_b = pixels[2] as i16;

    // Inline pixel comparison — checks RGB channels, ignores alpha
    let is_border_pixel = |idx: usize| -> bool {
        let r = pixels[idx] as i16;
        let g = pixels[idx + 1] as i16;
        let b = pixels[idx + 2] as i16;
        (r - ref_r).abs() <= thresh && (g - ref_g).abs() <= thresh && (b - ref_b).abs() <= thresh
    };

    // Scan top edge: check entire rows top-down, break on first non-border row
    let mut top: usize = 0;
    'top_scan: for y in 0..h {
        for x in 0..w {
            if !is_border_pixel((y * w + x) * 4) {
                top = y;
                break 'top_scan;
            }
        }
        top = y + 1; // This entire row was border
    }

    // Scan bottom edge (from bottom up)
    let mut bottom: usize = 0;
    'bottom_scan: for y in (0..h).rev() {
        for x in 0..w {
            if !is_border_pixel((y * w + x) * 4) {
                bottom = h - 1 - y;
                break 'bottom_scan;
            }
        }
        bottom = h - y; // This entire row was border
    }

    // Scan left edge: only check within the content row range
    let content_top = top;
    let content_bottom = h.saturating_sub(bottom);
    let mut left: usize = 0;
    'left_scan: for x in 0..w {
        for y in content_top..content_bottom {
            if !is_border_pixel((y * w + x) * 4) {
                left = x;
                break 'left_scan;
            }
        }
        left = x + 1; // This entire column was border
    }

    // Scan right edge (from right to left)
    let mut right: usize = 0;
    'right_scan: for x in (0..w).rev() {
        for y in content_top..content_bottom {
            if !is_border_pixel((y * w + x) * 4) {
                right = w - 1 - x;
                break 'right_scan;
            }
        }
        right = w - x; // This entire column was border
    }

    // Enforce minimum 10×10 content area
    let content_w = w.saturating_sub(left).saturating_sub(right);
    let content_h = h.saturating_sub(top).saturating_sub(bottom);
    if content_w < 10 || content_h < 10 {
        return zero;
    }

    TrimBounds {
        top: top as u32,
        right: right as u32,
        bottom: bottom as u32,
        left: left as u32,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: create a solid-color RGBA image
    fn solid_image(w: usize, h: usize, r: u8, g: u8, b: u8) -> Vec<u8> {
        let mut pixels = vec![0u8; w * h * 4];
        for i in 0..(w * h) {
            pixels[i * 4] = r;
            pixels[i * 4 + 1] = g;
            pixels[i * 4 + 2] = b;
            pixels[i * 4 + 3] = 255;
        }
        pixels
    }

    /// Helper: fill a rectangular region with a specific color
    fn fill_rect(
        pixels: &mut [u8],
        w: usize,
        x: usize,
        y: usize,
        rw: usize,
        rh: usize,
        r: u8,
        g: u8,
        b: u8,
    ) {
        for row in y..(y + rh) {
            for col in x..(x + rw) {
                let idx = (row * w + col) * 4;
                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = 255;
            }
        }
    }

    #[test]
    fn no_border_returns_zero() {
        // 20×20 image, all one color = entire image is "border"
        // but content would be 0×0 < 10×10, so returns zero
        let pixels = solid_image(20, 20, 128, 128, 128);
        let result = detect_trim_bounds(&pixels, 20, 20, 10);
        assert_eq!(result.top, 0);
        assert_eq!(result.right, 0);
        assert_eq!(result.bottom, 0);
        assert_eq!(result.left, 0);
    }

    #[test]
    fn uniform_border_detected() {
        // 100×100 image with white border and black 80×80 content
        let mut pixels = solid_image(100, 100, 255, 255, 255);
        fill_rect(&mut pixels, 100, 10, 10, 80, 80, 0, 0, 0);

        let result = detect_trim_bounds(&pixels, 100, 100, 10);
        assert_eq!(result.top, 10);
        assert_eq!(result.bottom, 10);
        assert_eq!(result.left, 10);
        assert_eq!(result.right, 10);
    }

    #[test]
    fn asymmetric_border() {
        // 100×100: top=5, bottom=15, left=20, right=10
        let mut pixels = solid_image(100, 100, 200, 200, 200);
        fill_rect(&mut pixels, 100, 20, 5, 70, 80, 50, 50, 50);

        let result = detect_trim_bounds(&pixels, 100, 100, 10);
        assert_eq!(result.top, 5);
        assert_eq!(result.bottom, 15);
        assert_eq!(result.left, 20);
        assert_eq!(result.right, 10);
    }

    #[test]
    fn jpeg_artifacts_within_threshold() {
        // Border pixels slightly off from corner pixel (within threshold=10)
        let mut pixels = solid_image(50, 50, 200, 200, 200);
        // Add content
        fill_rect(&mut pixels, 50, 5, 5, 40, 40, 50, 50, 50);

        // Make some border pixels slightly different (simulating JPEG)
        // Top-right corner: (199, 203, 197) — within threshold of (200,200,200)
        let idx = (0 * 50 + 49) * 4;
        pixels[idx] = 199;
        pixels[idx + 1] = 203;
        pixels[idx + 2] = 197;

        let result = detect_trim_bounds(&pixels, 50, 50, 10);
        assert_eq!(result.top, 5);
        assert_eq!(result.bottom, 5);
        assert_eq!(result.left, 5);
        assert_eq!(result.right, 5);
    }

    #[test]
    fn too_small_to_trim() {
        let pixels = solid_image(8, 8, 100, 100, 100);
        let result = detect_trim_bounds(&pixels, 8, 8, 10);
        assert_eq!(result.top, 0);
        assert_eq!(result.right, 0);
        assert_eq!(result.bottom, 0);
        assert_eq!(result.left, 0);
    }

    #[test]
    fn minimum_content_enforcement() {
        // 30×30 image with 25px border on each side would leave 0 content
        // Actually: border that would leave < 10×10
        let mut pixels = solid_image(30, 30, 255, 255, 255);
        // Small 8×8 content in center — below 10×10 minimum
        fill_rect(&mut pixels, 30, 11, 11, 8, 8, 0, 0, 0);

        let result = detect_trim_bounds(&pixels, 30, 30, 10);
        // Should return zeros because content (8×8) < 10×10
        assert_eq!(result.top, 0);
        assert_eq!(result.right, 0);
        assert_eq!(result.bottom, 0);
        assert_eq!(result.left, 0);
    }

    #[test]
    fn no_border_content_fills_image() {
        // Image entirely different from corner — no border at all
        let mut pixels = solid_image(50, 50, 100, 100, 100);
        // Make top-left corner different from everything else
        // Actually, the *corner* IS the reference. So if everything matches
        // the corner, the whole image is border.
        // Instead: make a varied image where row 0 col 1 differs.
        pixels[4] = 200; // pixel (1,0) red channel = 200, far from 100
        pixels[5] = 200;
        pixels[6] = 200;

        let result = detect_trim_bounds(&pixels, 50, 50, 10);
        // First row has non-border pixel at x=1, so top=0
        assert_eq!(result.top, 0);
        assert_eq!(result.bottom, 0);
        assert_eq!(result.left, 0);
        assert_eq!(result.right, 0);
    }

    #[test]
    fn threshold_zero_exact_match_only() {
        let mut pixels = solid_image(50, 50, 200, 200, 200);
        fill_rect(&mut pixels, 50, 5, 5, 40, 40, 0, 0, 0);

        // Make one border pixel off by 1
        let idx = (0 * 50 + 25) * 4; // middle of top row
        pixels[idx] = 201;

        // With threshold=0, that pixel breaks the border
        let result = detect_trim_bounds(&pixels, 50, 50, 0);
        assert_eq!(result.top, 0); // Row 0 has a non-matching pixel
    }
}
