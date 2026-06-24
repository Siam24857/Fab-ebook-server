require('dotenv').config();
const express = require('express');
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// ==================== CONFIGURATION ====================
const port = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(cors());

// ==================== DATABASE CONNECTION ====================
const uri = process.env.MONGO_DB_URI;

// Check if MongoDB URI exists
if (!uri) {
  console.error('❌ MONGO_DB_URI is not defined in environment variables');
  // For Vercel - show error response
  module.exports = (req, res) => {
    res.status(500).json({ 
      error: 'MONGO_DB_URI environment variable is not set',
      message: 'Please add your MongoDB connection string to Vercel environment variables'
    });
  };
  return;
}

// Cache connection for serverless environment
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    console.log('✅ Using cached database connection');
    return { client: cachedClient, db: cachedDb };
  }

  try {
    console.log('🔄 Creating new database connection...');
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    
    await client.connect();
    const db = client.db("FabBook");
    
    cachedClient = client;
    cachedDb = db;
    
    console.log('✅ MongoDB Connected Successfully');
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Get collections with error handling
async function getCollections() {
  try {
    const { db } = await connectToDatabase();
    return {
      Ebookscollenction: db.collection("Books"),
      bookshistorycollection: db.collection("Bookshistory"),
      bookmarkcollection: db.collection("Bookmark"),
      usercollection: db.collection("user"),
      sessioncollection: db.collection("session")
    };
  } catch (error) {
    console.error('❌ Error getting collections:', error);
    throw error;
  }
}

// ==================== AUTH MIDDLEWARE ====================
const Verifytoken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "No token provided" 
      });
    }

    const seissontoken = token.split(" ")[1];
    if (!seissontoken) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token format" 
      });
    }

    const { sessioncollection, usercollection } = await getCollections();
    
    const seissondata = await sessioncollection.findOne({ token: seissontoken });
    if (!seissondata) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid session" 
      });
    }

    const userdata = await usercollection.findOne({ id: seissondata.id });
    if (!userdata) {
      return res.status(401).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    req.user = userdata;
    next();
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Authentication failed" 
    });
  }
};

const Adminverify = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: "Unauthorized" 
    });
  }
  
  const userrole = req.user.role;
  if (userrole !== "admin") {
    return res.status(403).json({ 
      success: false, 
      error: "Access denied. Admin only." 
    });
  }
  next();
};

const Writerverify = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: "Unauthorized" 
    });
  }
  
  const userrole = req.user.role;
  if (userrole !== "writer") {
    return res.status(403).json({ 
      success: false, 
      error: "Access denied. Writer only." 
    });
  }
  next();
};

const Readerverify = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: "Unauthorized" 
    });
  }
  
  const userrole = req.user.role;
  if (userrole !== "reader") {
    return res.status(403).json({ 
      success: false, 
      error: "Access denied. Reader only." 
    });
  }
  next();
};

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (req, res) => {
  try {
    const { Ebookscollenction } = await getCollections();
    const count = await Ebookscollenction.countDocuments();
    res.json({
      success: true,
      status: 'healthy',
      message: 'Server is running!',
      database: 'connected',
      bookCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== HOME ROUTE ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '📚 E-Book API is running!',
    version: '1.0.0',
    endpoints: {
      public: [
        '/',
        '/api/health',
        '/allbooks',
        '/somebooks',
        '/bookdettails/:id',
        '/alluser'
      ],
      protected: [
        '/ebooks/:id (PATCH)',
        '/bookdeleted/:id (DELETE)',
        '/delteeuser/:id (DELETE)',
        '/deltebook/:id (DELETE)',
        '/historybook (POST)',
        '/createbook (POST)',
        '/bookhistory/:id',
        '/readers/:id',
        '/updateuser/:id (PATCH)',
        '/updatebook/:id (PATCH)',
        '/historybooks',
        '/writerbook/:id'
      ],
      public_free: [
        '/bookmark (POST)'
      ]
    },
    documentation: 'See README.md for API documentation'
  });
});

// ==================== PUBLIC ROUTES ====================

// Get all books
app.get('/allbooks', async (req, res) => {
  try {
    const { Ebookscollenction } = await getCollections();
    const result = await Ebookscollenction.find().toArray();
    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching all books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch books',
      message: error.message
    });
  }
});

// Get limited books (5)
app.get('/somebooks', async (req, res) => {
  try {
    const { Ebookscollenction } = await getCollections();
    const result = await Ebookscollenction.find().limit(5).toArray();
    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching some books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch books',
      message: error.message
    });
  }
});

// Get book details by ID
app.get('/bookdettails/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid book ID format'
      });
    }

    const { Ebookscollenction } = await getCollections();
    const result = await Ebookscollenction.findOne({ _id: new ObjectId(id) });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching book details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch book details',
      message: error.message
    });
  }
});

 

app.get('/alluser', async (req, res) => {
  try {
    const { usercollection } = await getCollections();
    const result = await usercollection.find().toArray();
    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

 
app.get('/readerbookhistory/:id', Verifytoken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bookshistorycollection } = await getCollections();
    const result = await bookshistorycollection.find({ userId: id }).toArray();
    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching reader history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reader history',
      message: error.message
    });
  }
});

 
app.get('/writerbookhistory/:id', Verifytoken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bookshistorycollection } = await getCollections();
    const result = await bookshistorycollection.find({ writerId: id }).toArray();
    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching writer history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch writer history',
      message: error.message
    });
  }
});

 
app.patch("/ebooks/:id", Verifytoken, async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;
    const { Ebookscollenction } = await getCollections();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid book ID format'
      });
    }

    const result = await Ebookscollenction.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error updating ebook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update book',
      message: error.message
    });
  }
});
 
app.delete("/bookdeleted/:id", Verifytoken, async (req, res) => {
  try {
    const { id } = req.params;
    const { Ebookscollenction } = await getCollections();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid book ID format'
      });
    }

    const result = await Ebookscollenction.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error deleting book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book',
      message: error.message
    });
  }
});

 
app.delete("/delteeuser/:id", Verifytoken, Adminverify, async (req, res) => {
  try {
    const { id } = req.params;
    const { usercollection } = await getCollections();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const result = await usercollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

// Delete book (admin only)
app.delete("/deltebook/:id", Verifytoken, Adminverify, async (req, res) => {
  try {
    const { id } = req.params;
    const { Ebookscollenction } = await getCollections();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid book ID format'
      });
    }

    const result = await Ebookscollenction.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error deleting book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book',
      message: error.message
    });
  }
});

// Add to history
app.post('/historybook', Verifytoken, async (req, res) => {
  try {
    const historydata = req.body;
    const { bookshistorycollection } = await getCollections();

    const newHistory = {
      ...historydata,
      date: new Date().toISOString()
    };

    const result = await bookshistorycollection.insertOne(newHistory);

    res.json({
      success: true,
      message: 'Book added to history',
      data: result
    });
  } catch (error) {
    console.error('❌ Error adding history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add history',
      message: error.message
    });
  }
});

// Add bookmark (public - as per your original code)
app.post('/bookmark', async (req, res) => {
  try {
    const bookmarkdata = req.body;
    const { bookmarkcollection } = await getCollections();

    const result = await bookmarkcollection.insertOne(bookmarkdata);

    res.json({
      success: true,
      message: 'Bookmark added successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error adding bookmark:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add bookmark',
      message: error.message
    });
  }
});

// Create book (writer only)
app.post('/createbook', Verifytoken, Writerverify, async (req, res) => {
  try {
    const bookdatas = req.body;
    const { Ebookscollenction } = await getCollections();

    const newBook = {
      ...bookdatas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await Ebookscollenction.insertOne(newBook);

    res.json({
      success: true,
      message: 'Book created successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error creating book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create book',
      message: error.message
    });
  }
});

// Book history by product ID
app.get('/bookhistory/:id', Verifytoken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bookshistorycollection } = await getCollections();

    const result = await bookshistorycollection.find({ productId: id }).toArray();

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching book history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch book history',
      message: error.message
    });
  }
});

// Get readers by role
app.get('/readers/:id', Verifytoken, Readerverify, async (req, res) => {
  try {
    const { id } = req.params;
    const { usercollection } = await getCollections();

    const result = await usercollection.find({ role: id }).toArray();

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching readers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch readers',
      message: error.message
    });
  }
});

// Update user
app.patch('/updateuser/:id', Verifytoken, async (req, res) => {
  try {
    const { id } = req.params;
    const userdata = req.body;
    const { usercollection } = await getCollections();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const result = await usercollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: userdata }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
});

// Update book status
app.patch('/updatebook/:id', Verifytoken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { Ebookscollenction } = await getCollections();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid book ID format'
      });
    }

    const result = await Ebookscollenction.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book status updated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error updating book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update book',
      message: error.message
    });
  }
});

// Get all history books
app.get('/historybooks', Verifytoken, async (req, res) => {
  try {
    const { bookshistorycollection } = await getCollections();
    const result = await bookshistorycollection.find().toArray();

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching history books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history books',
      message: error.message
    });
  }
});

// Get writer's books
app.get('/writerbook/:id', Verifytoken, async (req, res) => {
  try {
    const { id } = req.params;
    const { Ebookscollenction } = await getCollections();

    const result = await Ebookscollenction.find({ writerId: id }).toArray();

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching writer books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch writer books',
      message: error.message
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== START SERVER ====================

// For Vercel - export the app
module.exports = app;

// For local development
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📚 Health check: http://localhost:${port}/api/health`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}