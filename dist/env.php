<?php
/**
 * Lenzorah PHP env loader (reads simple KEY="value" pairs from .env)
 *
 * Usage:
 *   require_once __DIR__ . '/env.php';
 *   $key = getenv('VAR_NAME');
 */

function lenzorah_load_env(string $envPath): void {
  if (!file_exists($envPath)) {
    return;
  }

  $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if ($lines === false) {
    return;
  }

  foreach ($lines as $line) {
    $line = trim($line);

    // skip comments
    if ($line === '' || str_starts_with($line, '#')) {
      continue;
    }

    // support: KEY=value or KEY="value"
    $eqPos = strpos($line, '=');
    if ($eqPos === false) {
      continue;
    }

    $key = trim(substr($line, 0, $eqPos));
    $value = trim(substr($line, $eqPos + 1));

    // strip surrounding quotes
    if (strlen($value) >= 2) {
      $first = $value[0];
      $last = $value[strlen($value) - 1];
      if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
        $value = substr($value, 1, -1);
      }
    }

    if ($key !== '') {
      putenv($key . '=' . $value);
      $_ENV[$key] = $value;
    }
  }
}

// Load .env from project root (two levels up from public/env.php)
$projectRoot = dirname(__DIR__);
$envFile = $projectRoot . DIRECTORY_SEPARATOR . '.env';
lenzorah_load_env($envFile);

