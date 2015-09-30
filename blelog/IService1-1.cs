﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.ServiceModel.Web;
using System.Text;
using System.Data;

namespace BleLog
{

     [ServiceContract]
    public interface IBleLog
    {
        [OperationContract]
        [WebInvoke(Method = "POST", UriTemplate = "/GetLogdata", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        [ServiceKnownType(typeof(List<Logdata>))]
        IEnumerable<Logdata> GetLogdata(DataRequest query);
         
        [OperationContract]
        [WebInvoke(Method = "POST", UriTemplate = "/GetSensorNames", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        [ServiceKnownType(typeof(List<Sensor>))]
        IEnumerable<Sensor> GetSensorNames(int userID);

        [OperationContract]
        [WebInvoke(Method = "POST", UriTemplate = "/Login", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        Login Login(Login login);

        [OperationContract]
        [WebInvoke(Method = "POST", UriTemplate = "/Signup", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        string Signup(Login login);

        //[OperationContract]
        //[WebInvoke(Method = "POST", UriTemplate = "/SaveEvent", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        //string SaveEvent(Event ev);

        //[OperationContract]
        //[WebInvoke(Method = "POST", UriTemplate = "/LoadEvents", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        //IEnumerable<Event> LoadEvents(Event ev);

        //[OperationContract]
        //[WebInvoke(Method = "POST", UriTemplate = "/LoadEntries", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        //IEnumerable<Entry> LoadEntries(int eventID);

        //[OperationContract]
        //[WebInvoke(Method = "POST", UriTemplate = "/SeedEntries", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        //IEnumerable<Entry> SeedEntries(Event ev);
                 
        [OperationContract]
        [WebInvoke(Method = "POST", UriTemplate = "/SaveLogdata", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        UploadResult SaveLogdata(IEnumerable<Logdata> logdata);

        [OperationContract]
        [WebInvoke(Method = "POST", UriTemplate = "/SaveSensor", RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
        string SaveSensor(Sensor sensor);
    }

}
