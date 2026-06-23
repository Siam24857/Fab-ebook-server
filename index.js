const express = require('express');
const app = express()
const port = 5000
const cors = require("cors");
const dontenv = require("dotenv")
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(express.json())
app.use(cors())

const uri = process.env.MONGO_DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

     const database = client.db("FabBook");
    const Ebookscollenction = database.collection("Books");
    const bookshistorycollection = database.collection("Bookshistory");
    const bookmarkcollection = database.collection("Bookmark");
    const usercollection = database.collection("user");
    const sessioncollection = database.collection("session");


 const Verifytoken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const seissontoken = token.split(" ")[1];

    const seissondata = await sessioncollection.findOne({ token: seissontoken });
    const quiry = {
      id: seissondata.id
    }
    const userdata = await usercollection.findOne(quiry)

    if (!userdata) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = userdata;
    next();
  } catch (error) {
    res.status(500).json({ error: "Auth error" });
  }
};


const Adminverify = (req, res, next) => {
  const userrole = req.user.role;

  if (userrole !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }

  next();
};

const Writerverify = (req, res, next) => {
  const userrole = req.user.role;

  if (userrole !== "writer") {
    return res.status(403).json({ error: "Access denied. writer only." });
  }

  next();
};

const Readerverify = (req, res, next) => {
  const userrole = req.user.role;

  if (userrole !== "reader") {
    return res.status(403).json({ error: "Access denied. reader only." });
  }

  next();
};
   app.get('/allbooks', async (req, res) =>{
     const result = await Ebookscollenction.find().toArray()
     res.send(result)
   })
   app.get('/somebooks', async (req, res) =>{
     const result = await Ebookscollenction.find().limit(5).toArray()
     res.send(result)
   })

   app.get('/readerbookhistory/:id', async (req, res) =>{
    const { id } = req.params
    const quiry ={
      userId: id
    }
     const result = await bookshistorycollection.find(quiry).toArray()
     res.send(result)
   })
   app.get('/writerbookhistory/:id', Verifytoken, Writerverify, async (req, res) =>{
    const { id } = req.params
    const quiry ={
      writerId: id
    }
     const result = await bookshistorycollection.find(quiry).toArray()
     res.send(result)
   })

   app.patch("/ebooks/:id",Verifytoken,  async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  const result = await  Ebookscollenction.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: updateData,
    }
  );

  res.send(result);
});

app.delete("/bookdeleted/:id", Verifytoken, async (req, res) => {
    const { id } = req.params;

    const result = await Ebookscollenction.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
});

app.delete("/delteeuser/:id",Verifytoken, async (req, res) => {
    const { id } = req.params;

    const result = await usercollection.deleteOne({
      _id: new ObjectId(id)
    });

    res.send(result);
});


app.delete("/deltebook/:id",Verifytoken,  async (req, res) => {
    const { id } = req.params;

    const result = await Ebookscollenction.deleteOne({
      _id: new ObjectId(id)
    });

    res.send(result);
});

   app.post('/historybook',Verifytoken,  async (req, res) =>{
    const historydata = req.body

    const qury ={
      ...historydata,
      date: new Date()
    }
     const result = await bookshistorycollection.insertOne(qury)
     res.send(result)
   })

   app.post('/bookmark', async (req, res) =>{
    const bookmarkdata = req.body
     const result = await bookmarkcollection.insertOne(bookmarkdata)
     res.send(result)
   })

   app.post('/createbook', Verifytoken, Writerverify, async (req, res) =>{
    const bookdatas = req.body
     const result = await Ebookscollenction.insertOne(bookdatas)
     res.send(result)
   })


   app.get('/bookdettails/:id', async (req, res) => {
  try {
    const { id } = req.params; // Correctly destructure the id
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid book ID format' });
    }
    
    const query = {
      _id: new ObjectId(id)
    };
    
    const result = await Ebookscollenction.findOne(query); // No .toArray()
    
    if (!result) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/bookhistory/:id',Verifytoken, async (req, res) => {
  const { id } = req.params;

  const result = await bookshistorycollection.find({ productId: id }).toArray();

  res.send(result);
});


app.get('/readers/:id',Verifytoken, Readerverify, async (req, res) => {
  const { id } = req.params;

  const result = await usercollection.find({ role: id }).toArray();

  res.send(result);
});

app.patch('/updateuser/:id',Verifytoken, async (req, res) => {
  const { id } = req.params;
  const userdata = req.body;

  const result = await usercollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: userdata
    }
  );

  res.send(result);
});

app.patch('/updatebook/:id',Verifytoken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await Ebookscollenction.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: { status: status }
    }
  );

  res.send(result);
});

app.get('/historybooks',Verifytoken, async (req, res) => {
  const result = await bookshistorycollection.find().toArray();

  res.send(result);
});

app.get('/alluser', Verifytoken, async (req, res) => {
  const result = await usercollection.find().toArray();

  res.send(result);
});

 

app.get('/writerbook/:id', Verifytoken, async (req, res) => {
  const { id } = req.params;

  const result = await Ebookscollenction.find({ writerId: id }).toArray();

  res.send(result);
});



 

  } finally {
     
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})