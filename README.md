Project Description:

This project offers an interactive 3D visualization of global temperature anomalies spanning over a century. It begins with raw temperature data, from which latitude and longitude points associated with temperature anomalies are extracted and saved into a JSON format for efficient use. Leveraging Three.js, a 3D globe is created to represent Earth dynamically within the browser.

A heatmap layer, generated from the temperature anomaly data, is carefully overlaid onto the globe to visually represent regional warming and cooling trends. To enhance realism, a very high-resolution Earth texture image was downloaded and integrated as the globe’s surface. Due to the original image’s enormous size (128 MB), it was downscaled to balance visual quality with web performance.

One significant challenge was accurately mapping and aligning the texture on the globe — particularly ensuring the prime meridian and equator lines correctly corresponded with the temperature data. Through iterative adjustments, the texture was precisely positioned so that heatmap overlays and geographic coordinates aligned seamlessly, resulting in an immersive and accurate climate visualization tool.

Users can interact with the globe by rotating it, adjusting the timeline slider to explore temperature changes year by year, and toggling the heatmap display for clearer analysis. This project not only demonstrates advanced web graphics and data processing techniques but also brings the global warming story to life in a visually compelling way.
