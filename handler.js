import handler from "./libs/handler-lib";
import { success } from "./libs/response-lib";
import dynamoDb from "./libs/dynamodb-lib";

import * as uuid from "uuid";

const TABLE_NAME = process.env.tableName;

export const searchByLocation = handler(async (event) => {
  const primaryKeyName = "country_city";
  const primaryKey = event.queryStringParameters.country_city; // + '_' + event.queryStringParameters.city;
  const params = {
    TableName: TABLE_NAME,
    IndexName: "SearchByLocation",
    KeyConditionExpression: `${primaryKeyName}  = :HprimaryKey`,
    ExpressionAttributeValues: {
      ':HprimaryKey': primaryKey
    }
  };
  const result = await dynamoDb.query(params);
  return success(result.Items);
});

export const getProperty = handler(async (event) => {
  const primaryKey = event.queryStringParameters.propertyId;
  const sortKey = "property";
  const params = {
    Key: {
      propertyId: primaryKey,
      sortKey: sortKey
    },
    TableName: TABLE_NAME
  };
  console.log(params);
  const result = await dynamoDb.get(params);
  if (!result.Item) {
    throw new Error("Item not found.");
  }
  return success(result.Item);
});

export const getPropertiesByOwner = handler(async (event) => {
  const primaryKey = event.requestContext.identity.cognitoIdentityId;
  const primaryKeyName = "ownerId";
  const params = {
    TableName: TABLE_NAME,
    IndexName: "SearchByOwner",
    KeyConditionExpression: `${primaryKeyName}  = :HprimaryKey`,
    ExpressionAttributeValues: {
      ':HprimaryKey': primaryKey
    }
  };
  console.log(params);
  const result = await dynamoDb.query(params);
  return success(result.Items);
});

export const addNewProperty = handler(async (event, context) => {
  const propertyDetails = JSON.parse(event.body);
  propertyDetails.ownerId = event.requestContext.identity.cognitoIdentityId;
  propertyDetails.propertyId = uuid.v1();
  propertyDetails.sortKey = "property";
  propertyDetails.country_city = propertyDetails.country+'_'+propertyDetails.city;
  propertyDetails.country_city = propertyDetails.country_city.toLowerCase();
  propertyDetails.createdAt = Date.now();
  const params = {
    TableName: process.env.tableName,
    Item: propertyDetails
  };
  console.log(params);
  await dynamoDb.put(params);
  return success(params.Item);
});

export const bookProperty = handler(async (event) => {
  const body = JSON.parse(event.body);
  const bookingDetails = {
    userId: event.requestContext.identity.cognitoIdentityId,
    propertyId: body.propertyId,
    propertyTitle: body.propertyTitle,
    startBookingDate: body.startBookingDate,
    endBookingDate: body.endBookingDate
  };
  bookingDetails.propertyId = body.propertyId;
  bookingDetails.sortKey = body.startBookingDate;
  bookingDetails.createdAt = Date.now();
  const params = {
    TableName: process.env.tableName,
    Item: bookingDetails
  };
  await dynamoDb.put(params);
  return success(params.Item);
});

export const getBookedDatesProperty  = handler(async (event) => {
  const propertyId = event.queryStringParameters.propertyId;
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'propertyId = :HpropertyId',
    ExpressionAttributeValues: {
      ':HpropertyId': propertyId
    }
  };
  console.log(params);
  const result = await dynamoDb.query(params);
  const cleanedResults = result.Items.map(booking => {
    if (booking.sortKey == undefined || booking.sortKey !== 'property') {
      return {
        userId: booking.userId,
        propertyId: booking.propertyId,
        startBookingDate: booking.startBookingDate,
        endBookingDate: booking.endBookingDate,
        pictureUrl: booking.pictureUrl
      };
    };
  });
  return success(cleanedResults);
});

export const getBookedPropertiesForUsers  = handler(async (event) => {
  const userId = event.requestContext.identity.cognitoIdentityId;
  const primaryKeyName = "userId";
  const params = {
    TableName: TABLE_NAME,
    IndexName: "SearchByUser",
    KeyConditionExpression: `${primaryKeyName}  = :HprimaryKey`,
    ExpressionAttributeValues: {
      ':HprimaryKey': userId
    }
  };
  console.log(params);
  const result = await dynamoDb.query(params);
  const cleanedResults = result.Items.map(booking => {
    if (booking.sortKey == undefined || booking.sortKey !== 'property') {
      return {
        userId: booking.userId,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
        startBookingDate: booking.startBookingDate,
        endBookingDate: booking.endBookingDate,
        pictureUrl: booking.pictureUrl
      };
    };
  });
  return success(cleanedResults);
});

export const deleteBookedProperty  = handler(async (event) => {
  const body = JSON.parse(event.body);
  const propertyId = body.propertyId;
  const sortKey = body.startBookingDate;
  const params = {
    TableName: process.env.tableName,
    Key: {
      propertyId: propertyId,
      sortKey: sortKey
    }
  };
  const result = await dynamoDb.delete(params);
  return success({
    requestBody: params.Key,
    result: result
  });
});

export const deleteProperty  = handler(async (event) => {
  const propertyId = event.queryStringParameters.propertyId;
  const params = {
    TableName: process.env.tableName,
    Key: {
      propertyId: propertyId,
      sortKey: 'property'
    }
  };
  const result = await dynamoDb.delete(params);
  return success({
    requestBody: params.Key,
    result: result
  });
});