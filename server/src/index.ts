import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 3000;

// Only start listening when run directly, so tests can import `app` without opening a port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
