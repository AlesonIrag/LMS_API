// Test health check
console.log('Testing health check...');

async function testHealth() {
  try {
    const response = await fetch('http://localhost:3000/');
    console.log('Health Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health Success:', data);
    } else {
      const error = await response.text();
      console.log('❌ Health Failed:', error);
    }
  } catch (error) {
    console.error('❌ Health Request failed:', error.message);
  }
}

setTimeout(testHealth, 1000);
