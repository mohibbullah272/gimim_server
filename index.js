require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express= require('express')
const cors = require('cors');
const port = process.env.PORT || 1000;
const app = express()
const  nodemailer =require('nodemailer')
app.use(cors())
app.use(express.json())
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });





app.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    // Build conversation context from history
    let contextPrompt = `You are a helpful AI assistant for GIMIM CORPORATION, an importer and wholesaler of premium products like superglue and adhesives. You should be professional, friendly, and helpful. Answer questions about the company, products, services, or provide general assistance.

Company Information:
- Name: GIMIM CORPORATION
- Business: Importer and wholesaler of premium products like superglue and    adhesives
- Focus: Unmatched quality and service
- Contact: gimimcorporationbd@gmail.com, +8801915651053
-head office : 689,west ibrahimpur ,80 dag kafrul dhaka-1216 

`;

    // Add conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      contextPrompt += "Previous conversation:\n";
      conversationHistory.slice(-5).forEach(msg => {
        if (msg.type === 'user') {
          contextPrompt += `User: ${msg.content}\n`;
        } else if (msg.type === 'bot') {
          contextPrompt += `Assistant: ${msg.content}\n`;
        }
      });
    }

    contextPrompt += `\nUser: ${message}\nAssistant:`;

    // Generate response using Gemini
    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    const text = response.text();

    // Return the response
    res.json({ 
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // console.error('Gemini AI Error:', error);
    
    // Handle specific error types
    if (error.message.includes('API_KEY_INVALID')) {
      return res.status(500).json({ 
        error: 'Invalid API key configuration' 
      });
    }
    
    if (error.message.includes('QUOTA_EXCEEDED')) {
      return res.status(429).json({ 
        error: 'API quota exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate response. Please try again.' 
    });
  }
});












const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3t5vk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);
const ProductCollection = client.db('GimimDB').collection('products')
const userCollection = client.db('GimimDB').collection('users')

// contact api 
app.post('/contact',async(req,res)=>{
  const { name, email, message ,subject} = req.body;
// console.log(name,email,message,subject)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS, 
    },
  });

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_USER,
    subject: subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
})


// product related api 
app.post('/products',async(req,res)=>{
    const product = req.body
    const result = await ProductCollection.insertOne(product)
    res.send(result)
})
app.get('/feature/product',async(req,res)=>{
    const result = await ProductCollection.find().limit(6).toArray()
    res.send(result)
})
app.get('/products',async(req,res)=>{
    const result =await ProductCollection.find().toArray()
    res.send(result)
})
app.delete('/products/:id', async (req, res) => {
  try {
      const { id } = req.params;
      
      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      const db = client.db('GimimDB');
      const collection = db.collection('products');
      

      const existingProduct = await collection.findOne({ _id: new ObjectId(id) });
      if (!existingProduct) {
          return res.status(404).json({ error: 'Product not found' });
      }
      
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Product not found' });
      }
      
      res.status(200).json({
          message: 'Product deleted successfully',
          deletedProduct: existingProduct
      });
  } catch (error) {
      // console.error('Error deleting product:', error);
      res.status(500).json({ 
          error: 'Failed to delete product',
          message: error.message 
      });
  }
});
app.get('/product/:id',async(req,res)=>{
    const id = req.params.id
    // console.log(id)
    const query = {_id: new ObjectId(id)}
    const result = await ProductCollection.findOne(query)
    res.send(result)
})
// user related api 
app.get('/checkAdmin', async (req, res) => {
  const email = req.query.email;

  // 🛡️ Basic validation
  if (!email) {
    return res.status(400).send({ error: true, message: 'Email is required' });
  }

  try {
    const user = await userCollection.findOne({ email });

 
    if (!user) {
      return res.send({ isAdmin: false, message: 'User not found' });
    }


    const isAdmin = user?.isAdmin === true;

    res.send({ isAdmin });
  } catch (error) {
    // console.error('Check Admin Error:', error);
    res.status(500).send({ error: true, message: 'Internal server error' });
  }
});

app.get('/users',async(req,res)=>{
    const result = await userCollection.find().toArray()
    res.send(result)
})
app.post('/users',async(req,res)=>{
    const {userInfo} = req.body
    const email = userInfo.email
    // console.log(email)
    const findUser = await userCollection.findOne({email})
    if(findUser){
    return  res.send({message:'user already exist'})
    }  
    const result = await userCollection.insertOne(userInfo)
    res.send(result)
})
app.get('/',(req,res)=>{
    res.send('gimim server is running')
})

app.listen(port, () => console.log(`server running on port ${port}`))