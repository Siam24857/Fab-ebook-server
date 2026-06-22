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



   app.get('/allbooks', async (req, res) =>{
     const result = await Ebookscollenction.find().toArray()
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
   app.get('/writerbookhistory/:id', async (req, res) =>{
    const { id } = req.params
    const quiry ={
      writerId: id
    }
     const result = await bookshistorycollection.find(quiry).toArray()
     res.send(result)
   })

   app.patch("/ebooks/:id", async (req, res) => {
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

app.delete("/bookdeleted/:id", async (req, res) => {
    const { id } = req.params;

    const result = await Ebookscollenction.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
});

app.delete("/delteeuser/:id", async (req, res) => {
    const { id } = req.params;

    const result = await usercollection.deleteOne({
      _id: new ObjectId(id)
    });

    res.send(result);
});


app.delete("/deltebook/:id", async (req, res) => {
    const { id } = req.params;

    const result = await Ebookscollenction.deleteOne({
      _id: new ObjectId(id)
    });

    res.send(result);
});

   app.post('/historybook', async (req, res) =>{
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

   app.post('/createbook', async (req, res) =>{
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

app.get('/bookhistory/:id', async (req, res) => {
  const { id } = req.params;

  const result = await bookshistorycollection.find({ productId: id }).toArray();

  res.send(result);
});


app.get('/readers/:id', async (req, res) => {
  const { id } = req.params;

  const result = await usercollection.find({ role: id }).toArray();

  res.send(result);
});

app.patch('/updateuser/:id', async (req, res) => {
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

app.patch('/updatebook/:id', async (req, res) => {
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

app.get('/historybooks', async (req, res) => {
  const result = await bookshistorycollection.find().toArray();

  res.send(result);
});

app.get('/alluser', async (req, res) => {
  const result = await usercollection.find().toArray();

  res.send(result);
});

 

app.get('/writerbook/:id', async (req, res) => {
  const { id } = req.params;

  const result = await Ebookscollenction.find({ writerId: id }).toArray();

  res.send(result);
});




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Ensures that the client will close when you finish/error
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