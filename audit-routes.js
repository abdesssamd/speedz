const fs = require('fs');

// Lire le fichier admin
const adminContent = fs.readFileSync('admin/src/App.jsx', 'utf8');
const backendContent = fs.readFileSync('backend/server.js', 'utf8');

// Extraire les routes de l'admin
const adminRoutes = new Set();
const adminRegex = /apiRequest\(`([^`]+)`/g;
let match;
while ((match = adminRegex.exec(adminContent)) !== null) {
  const route = match[1].replace(/\$\{[^}]+\}/g, ':id');
  adminRoutes.add(route);
}

// Extraire les routes du backend
const backendRoutes = new Set();
const backendRegex = /app\.(get|post|put|patch|delete)\("([^"]+)"/g;
while ((match = backendRegex.exec(backendContent)) !== null) {
  backendRoutes.add(match[2]);
}

console.log('=== ROUTES UTILISÉES PAR L\'ADMIN ===');
const adminRoutesArray = Array.from(adminRoutes).sort();
adminRoutesArray.forEach(route => console.log(route));

console.log('\n=== ROUTES DÉFINIES DANS LE BACKEND ===');
const backendRoutesArray = Array.from(backendRoutes).sort();
backendRoutesArray.forEach(route => console.log(route));

console.log('\n=== ROUTES MANQUANTES DANS LE BACKEND ===');
const missing = [];
adminRoutesArray.forEach(adminRoute => {
  const normalized = adminRoute.replace(/:id/g, ':id');
  if (!backendRoutesArray.some(backendRoute => {
    const backendNormalized = backendRoute.replace(/:id/g, ':id');
    return backendNormalized === normalized;
  })) {
    missing.push(adminRoute);
  }
});

if (missing.length === 0) {
  console.log('✓ Toutes les routes admin existent dans le backend');
} else {
  missing.forEach(route => console.log('✗ MANQUANT:', route));
}
