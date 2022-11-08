/*eslint-disable*/
import * as functions from "firebase-functions";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const scrapeMostActiveMarket = require('./scraper');


// eslint-disable-next-line max-len
exports.isAdmin = functions.region("europe-west2").https.onCall((_data, context) => {
  // eslint-disable-next-line max-len, @typescript-eslint/no-non-null-assertion
  return admin.firestore().collection("users").doc(context.auth!.uid).get().then((doc: any) => {
    if (doc.exists) {
      const isAdmin = doc.data()?.isAdmin;
      if (isAdmin == false) {
        return {
          userIsAdmin: false,
        };
      }
      return {
        userIsAdmin: true,
      };
    }
    return null;
  })
      .catch(() => {
        return null;
      });
});


exports.retrieveUsers = functions.region("europe-west2").https.onCall((_data, context) =>{
  // eslint-disable-next-line max-len, @typescript-eslint/no-non-null-assertion
  return admin.firestore().collection("users").doc(context.auth!.uid).get().then((doc: any) =>{
    if (doc.exists) {
      const isAdmin = doc.data()?.isAdmin;
      if (isAdmin == false) {
        return null;
      }
      const userCompany = doc.data()?.company;
      const comp = String(userCompany).substring(1).split("/");
      // eslint-disable-next-line max-len
      const compName = db.collection(comp[0]).doc(comp[1]).get().then((compDoc: any) => {
        return compDoc.data().name;
      });
      // eslint-disable-next-line max-len
      return admin.firestore().collection("users").where("company", "==", userCompany).get().then((snapshot: any) => {
        const userArr: string[][] = [];
        const r: string[] = [];
        let count = 0;
        snapshot.forEach((userDoc: any) => {
          const userData = userDoc.data();
          r[0] = compName;
          r[1] = userData.isAdmin;
          r[2] = userData.name;
          userArr[count] = r;
          count += 1;
        });
        return userArr;
      });
    } else {
      return null;
    }
  });
});


exports.retrieveMostActiveMarkets = functions.runWith({memory: '1GB'}).region("europe-west2").https.onCall(async (_data, context) =>{
  const allData: { [key:string] : any } = await scrapeMostActiveMarket();
  for (let key in allData){
    let itemData = allData[key];
    let price = itemData["price"];
    let percentage = itemData["percentage"];
    let progress = itemData["progress"];
    try {
        let ref = admin.firestore().collection('markets').doc(key);
        ref.get().then((doc: any) => {
            if(doc.exists){
                ref.update({ 
                    price: price,
                    percentage: percentage,
                    progress: progress
                });
            } else {
              ref.set({
                price: price,
                percentage: percentage,
                progress: progress
              });
            }
        });
    }catch(error) {
        functions.logger.log(error);
    }
  }
});