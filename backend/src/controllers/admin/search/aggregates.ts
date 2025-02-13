import { PipelineStage } from "mongoose"
import { OrderModel } from "../../../models/orderModel";

interface OrderMatchFilter {
  paymentStatus?: string;
  createdAt?: { $gte: Date };
  deliveryStatus?: string;
  country?: string;
  totalPrice?: { $gte?: number; $lte?: number };
}

export const searchOrderAgg= async (filter:any,skip:number,limit:number=10)=>{ // for now *** 
const {
  createdAt,
  deliveryStatus,
  minProfit,
  maxProfit,
  minPrice,
  maxPrice,
  country, // fix location -> multiple variables -> returned to json returned as one **
  name, // recipient name
} = filter;
const matchOpp:OrderMatchFilter={paymentStatus:"Complete"}
if(createdAt || deliveryStatus || country){
  if(createdAt){
    matchOpp.createdAt={$gte:createdAt}
  }
  if(deliveryStatus){
    matchOpp.deliveryStatus=deliveryStatus
  }
  if(country){
    matchOpp.country=country
  }
  if (minPrice || maxPrice) {
    matchOpp.totalPrice={}
    if(minPrice)  matchOpp.totalPrice= {$gte:minPrice}
    if(maxPrice)  matchOpp.totalPrice = { $lte: maxPrice };
  }
  if(minProfit || maxProfit){

  }
}
const searchAgg :PipelineStage[]=[]
if (name) {
  searchAgg.push({
    $search: {
      text: {
        query: name,
        path: ["name"],
      },
    },
  });
}
// Add the base match opperation
searchAgg.push({$match:matchOpp})

if(minProfit | maxProfit){
  searchAgg.push({
    $match: {
      $expr: {
        $and: [
          { $gte: [{ $subtract: ["$totalPrice", "$totalCost"] }, minProfit] },
          { $lte: [{ $subtract: ["$totalPrice", "$totalCost"] }, maxProfit] },
        ],
      },
    },
  });
}
// Add limit and skip 
searchAgg.push({
  $facet: {
    totalCount: [{ $count: "count" }],
    result: [{ $skip: skip }, { $limit: limit }],
  },
});
const result = await OrderModel.aggregate(searchAgg)
return result.length === 0 ? [] : result[0];
}

