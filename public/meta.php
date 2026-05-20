<?php
/**
 * Lenzorah Dynamic Meta Tags Injector
 * 
 * Intercepts requests to /movie/* and /watch/* endpoints to inject 
 * dynamic Open Graph / Twitter Card SEO tags before serving the standard index.html.
 * This ensures rich link previews on WhatsApp, Twitter, Discord, etc.
 */

$request_uri = $_SERVER['REQUEST_URI'];
$html_path = __DIR__ . '/index.html';

if (!file_exists($html_path)) {
    http_response_code(404);
    echo "index.html not found. Please build the application first.";
    exit;
}

$html = file_get_contents($html_path);

// Check if it's a movie or watch page
if (preg_match('/^\/(?:movie|watch)\/([a-zA-Z0-9-]+)$/i', parse_url($request_uri, PHP_URL_PATH), $matches)) {
    $slug = $matches[1];
    $lastHyphenIndex = strrpos($slug, '-');
    
    if ($lastHyphenIndex !== false) {
        $id = substr($slug, $lastHyphenIndex + 1);
    } else {
        $id = $slug;
    }
    
    require_once __DIR__ . '/env.php';

    $api_key = getenv('MOVIE_API_KEY') ?: '';
    $api_base = getenv('MOVIE_API_BASE') ?: '';

    if (!$api_key || !$api_base) {
        http_response_code(500);
        echo "Server env missing: MOVIE_API_KEY and/or MOVIE_API_BASE";
        exit;
    }

    $api_url = rtrim($api_base, '/') . '/api/v2/info?id=' . urlencode($id);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer " . $api_key,
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    
    // Ignore SSL locally just in case
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($status_code == 200 && $response) {
        $data = json_decode($response, true);
        if (isset($data['success']) && $data['success'] && isset($data['subject'])) {
            $subject = $data['subject'];
            $title = isset($subject['title']) ? htmlspecialchars($subject['title']) : '';
            $desc = isset($subject['description']) ? htmlspecialchars(substr($subject['description'], 0, 160)) . '...' : 'Watch instantly in high quality on Lenzorah.';
            $image = isset($subject['cover']['url']) ? htmlspecialchars($subject['cover']['url']) : '';
            
            $baseTitle = 'Lenzorah';
            $pageTitle = $title ? "$title — $baseTitle" : "$baseTitle — Movies & TV Series";
            
            // Generate meta tags block
            $meta_tags = "
    <!-- DYNAMIC SEO INJECTED BY META.PHP -->
    <title>$pageTitle</title>
    <meta name=\"description\" content=\"$desc\">
    
    <meta property=\"og:title\" content=\"$pageTitle\">
    <meta property=\"og:description\" content=\"$desc\">
    <meta property=\"og:image\" content=\"$image\">
    <meta property=\"og:type\" content=\"video.movie\">
    <meta property=\"og:url\" content=\"http" . (isset($_SERVER['HTTPS']) ? "s" : "") . "://$_SERVER[HTTP_HOST]$request_uri\">
    
    <meta name=\"twitter:card\" content=\"summary_large_image\">
    <meta name=\"twitter:title\" content=\"$pageTitle\">
    <meta name=\"twitter:description\" content=\"$desc\">
    <meta name=\"twitter:image\" content=\"$image\">
    <!-- /DYNAMIC SEO -->
";

            // Replace the original <title> block in the React index.html
            $html = preg_replace('/<title>.*?<\/title>/is', $meta_tags, $html, 1);
        }
    }
}

// Serve the modified (or untouched) index.html
echo $html;
