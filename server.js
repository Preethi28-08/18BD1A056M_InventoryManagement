const express=require('express')
const app=express()
const bodyParser=require('body-parser')
const MongoClient= require('mongodb').MongoClient

var db;
var s;

	//connection to database
MongoClient.connect('mongodb://localhost":27017/InventoryFashion', { useUnifiedTopology: true },(err,database)=>{
    if (err) return console.log(err)
	db=database.db('InventoryFashion')

	//to make the server listen to the database
	app.listen(5000, ()=>{
	    console.log("Connected to port number 5000")
    })
})
	
//to set the view of server is ejs 
app.set('view engine', 'ejs')
	
//data from bodyParser module in terms of json object
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req,res)=>{
  db.collection('FashionWear').find().toArray((err,result)=>{
    if(err) return console.log(err)
  res.render('homepage.ejs',{data: result}) //result is sent as data to homepage
  // all the records as objects and objects as array are sent to homepage
  })
})

//to load add.ejs file
app.get('/create', (req,res)=>{
    res.render('add.ejs')
})



app.get('/edit',(req,res)=>{
	var Fid=req.query.Fid;
	db.collection('FashionWear').find().toArray((err,result)=>{
		if(err) return console.log(err);
		res.render('update.ejs',{data:{Fid:Fid,FashionWear:result}});
	})
})

app.post('/AddData', (req,res)=>{
    db.collection('FashionWear').save(req.body,(err,result)=>{
      if(err) return console.log(err)
      res.redirect('/')
    })
})



app.post('/editupdate',(req,res)=>{
	var oldQuantity;
	var DATE=new Date();
	let day = ("0" + DATE.getDate()).slice(-2);
	let month = ("0" + (DATE.getMonth() + 1)).slice(-2);
	let year = DATE.getFullYear();
	var date=day.toString()+"-"+month.toString()+"-"+year.toString();
	var price;
	var quantity;
	var t_price;
	var change;
	var set=0;
	var id={Fid:req.body.Fid};
	var newValue;
	db.collection('FashionWear').find().toArray((err,result)=>{
		for(var i=0;i<result.length;i++){
			if(result[i].Fid==req.body.Fid){
				oldQuantity=result[i].Stock;
				if(parseInt(req.body.Stock)+parseInt(oldQuantity)<parseInt(oldQuantity)){
					price=result[i].Selling_price;
					quantity=parseInt(req.body.Stock)*-1;
					t_price=(parseInt(req.body.Stock))*parseInt(req.body.Selling_price)*-1;
					console.log(t_price);
				}
				break;
			}
		}
		if(parseInt(req.body.Stock)+parseInt(oldQuantity)<0){
			set=1;
			change=(parseInt(req.body.Stock)+parseInt(oldQuantity))*-1;
			newValue={ $set :{Stock:0,Selling_price:req.body.Selling_price}};
			quantity=quantity-change;
		}
		else{newValue={ $set :{Stock:parseInt(req.body.Stock)+parseInt(oldQuantity),Selling_price:req.body.Selling_price}};}
		db.collection('FashionWear').updateOne(id,newValue,(err,result)=>{
			if(err) return console.log(err);
			if(parseInt(req.body.Stock)+parseInt(oldQuantity)<parseInt(oldQuantity)){
				db.collection('FashionWear_Sales').find({Fid:req.body.Fid}).toArray((err,da)=>{
					var flag=0;
					for(var k=0;k<da.length;k++){
					if(da[k].Purchase_Date==date){
						flag=1;
						console.log("inside");
						var total=(da[k].Total_Sales+t_price);
						var quan=da[k].Stock+quantity;
						var updatequery={ $set :{Stock:quan,Total_Sales:total}};
						var _id={_id:da[k]._id};
						db.collection('FashionWear_Sales').updateOne(_id,updatequery,(err, bookresult)=>{
							if(err) return console.log("err");
						})
					}}
					if(flag==0){
						console.log("today");
						var pr=price;
						var qu=quantity;
						var tp=t_price;
						

						var q={Purchase_Date:date,Fid:req.body.Fid,Selling_price:pr,Stock:qu,Total_Sales:tp}
						db.collection('FashionWear_Sales').insertOne(q,(err,resultsale)=>{
							if(err) return console.log(err);
						})
					}
				})
			}
			res.redirect('/');
		})
	})
})


app.post('/delete', (req,res)=>{
    db.collection('FashionWear').findOneAndDelete({Fid: req.body.Fid}, (err,result)=>{
      if(err) return console.log(err)
      res.redirect('/')
    })
})


app.get('/sales',(req,res)=>{
	db.collection('FashionWear_Sales').find().toArray((err,result)=>{
		if(err) return console.log("err");
		res.render('sales_details.ejs',{data:result});
	})
})

app.post('/salesUpdate',(req,res)=>{
	console.log(req.body.Purchase_Date);

	db.collection('FashionWear_Sales').find({Fid:req.body.Fid,Purchase_Date:req.body.Purchase_Date}).toArray((err,result)=>{
		if(result.length==0){
			console.log("Couldn't find id or date");
		}
		else{
		if(err) return console.log(err);
		var t_price=parseInt(result[0].Total_Sales)-(parseInt(req.body.Stock)*parseInt(result[0].Selling_price)*-1);
		console.log(t_price);
		console.log(req.body.Stock);
		var quantity=parseInt(result[0].Stock)+parseInt(req.body.Stock);
		var query1={ $set :{Stock:quantity.toString(),Total_Sales:t_price}}
		var query={ _id :result[0]._id}
		var id=req.body.Fid;
		var qq=parseInt(req.body.Stock)*-1;
		if(quantity<=0){
			if(quantity<0){
				qq=result[0].Stock;
			}
			db.collection('FashionWear_Sales').deleteOne(query,(err,resultdel)=>{
				if(err) return console.log(err);
			})
		}
		else{
		db.collection('FashionWear_Sales').updateOne(query,query1,(err,results)=>{
			if(err) return console.log(err);
		})}
		db.collection('FashionWear').find({Fid:req.body.Fid}).toArray((err,resultsss)=>{
			if(err) return console.log(err);
			var q=(qq)+resultsss[0].Stock;
			var qr={ $set :{Stock:q}}
			db.collection("FashionWear").updateOne({Fid:req.body.Fid},qr,(err,resultss)=>{
				if(err) return console.log(err);
			})
		})
		}
		res.redirect('/sales')
		
	})
})

app.get('/salesd',(req,res)=>{
	res.render('update_sales.ejs');
})