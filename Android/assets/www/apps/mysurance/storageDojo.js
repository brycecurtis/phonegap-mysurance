
var gDB = null;  //global database handle
var vehicleFields = ["vName", "vMake", "vModel", "vYear", "vPlate","vin", "ownerId"];
var profileFields = ["lName","fName","street","city","state", "zip", "phone", "email", "licenseNo"];  // associated input fields have the same id attribute value
var locationFields = ["streetLoc", "cityLoc", "stateLoc", "zipLoc"];
var accInfoField= ["fNameAcc", "lNameAcc","phoneAcc","emailAcc","licenseNoAcc","insurerAcc","insurerNoAcc","vMakeAcc","vModelAcc","vYearAcc","vPlateAcc","vinAcc"];

/**
 * Error handler
 *
 * @param error
 */
function basicTxnErrorDB(error) {
    alert('Database error: '+error.message+' (Code '+error.code+')');
}

/**
 * Results handler
 *
 * @param trnsaction
 * @param results
 */
function basicTxnSuccessDB(trnasaction, results) {
    //debugLog("successful DB transaction");
}

/**
 * Drop database table
 *
 * @param tableName
 */
function dropTable(tableName){
    gDB.transaction(
        function(transaction){
            transaction.executeSql('DROP TABLE ' + tableName, [], basicSuccessDB, basicErrorDB);
        }
    );
}

/**
 * Create database tables if they don't already exist
 */
function createTables(){
    gDB.transaction(
        function(transaction){
            transaction.executeSql('CREATE TABLE IF NOT EXISTS profile (' +
            'profileId INTEGER PRIMARY KEY AUTOINCREMENT,' +
            'lName TEXT,' +
            'fName TEXT,' +
            'street TEXT,' +
            'city TEXT,' +
            'state TEXT,' +
            'zip TEXT,' +
            'phone TEXT,' +
            'email TEXT,'+
            'licenseNo TEXT,' +
            'isPrimary INTEGER NOT NULL DEFAULT 0);',
            [], function(){/* null data handler*/}, function(){/* error Hanlder*/ return false;}
        );
    }, basicTxnErrorDB, basicTxnSuccessDB);
    gDB.transaction(
        function(transaction){
            // will need to also associate owner id when add vehicles for accident data
            transaction.executeSql('CREATE TABLE IF NOT EXISTS vehicles(' +
            'vehicleId INTEGER PRIMARY KEY AUTOINCREMENT,' +
            'vName TEXT,' +
            'vMake TEXT,' +
            'vModel TEXT,' +
            'vYear TEXT,' +
            'vPlate TEXT,' +
            'vin TEXT,' +
            'ownerId INTEGER);',
            [], function(){/* null data handler*/}, function(){/* error Hanlder*/ return false;}
        );
    },basicTxnErrorDB, basicTxnSuccessDB);
    gDB.transaction(
        function(transaction){
            transaction.executeSql('CREATE TABLE IF NOT EXISTS location(' +
            'key TEXT PRIMARY KEY,' +
            'value TEXT);',
            [], function(){/* null data handler*/}, function(){/* error Hanlder*/ return false;}
        );
    },basicTxnErrorDB, basicTxnSuccessDB);
    gDB.transaction(
        function(transaction){
            transaction.executeSql('CREATE TABLE IF NOT EXISTS accident(' +
            'key TEXT PRIMARY KEY,' +
            'value TEXT);',
            [], function(){/* null data handler*/}, function(){/* error Hanlder*/ return false;}
        );
    },basicTxnErrorDB, basicTxnSuccessDB);
    gDB.transaction(
        function(transaction){
            transaction.executeSql('CREATE TABLE IF NOT EXISTS photos(' +
            'key TEXT PRIMARY KEY,' +
            'value TEXT);',
            [], function(){/* null data handler*/}, function(){/* error Hanlder*/ return false;}
        );
    },basicTxnErrorDB, basicTxnSuccessDB);
}

/**
 * Open database for application
 */
function getDatabase(){
    debugLog("getDatabase()");
    if (!gDB) {
        try {
            if (!window.openDatabase) {
                alert('Local data storage not supported');
            }
            else {
                var shortName = 'mysuranceDB';
                var version = '1.0';
                var displayName = 'Mysurance Database';
                var maxSize = 4000000; //65536; // in bytes
                gDB = openDatabase(shortName, version, displayName, maxSize);
                if (!gDB) {
                    debugLog("Error opening database: returned null.");
                    return;
                }
                createTables();
            }
        }
        catch (e) {
            // Error handling code goes here.
            if (e == 2) {
                // Version number mismatch.
                debugLog("Invalid database version.");
            }
            else {
                debugLog("Database error: " + e);
            }

        }
    }
}

/**
 * Store profile information to database
 *
 * @param isPrimary
 */
function storeProfile(isPrimary) {
    debugLog("storeProfile");
    if (!mysurance.profileChanged) {
        debugLog(" - not changed: just return");
        return;
    }
    mysurance.profileChanged = false;

    // needs error handling!
    var values = new Array(profileFields.length);
    var field = null;

    for (var i=0; i<profileFields.length; i++){
        field = document.getElementById(profileFields[i]);
        debugLog("field[" + i + "] = " + field);
        values[i] = (field && field.value !== "") ? field.value : ""; // value needs quoting for db security
    }

    var list = profileFields.toString();
    if (isPrimary){
        values[values.length] = "1";
        list+=",isPrimary";
    }
    list = list.replace(/,/g,"\",\"");  //not sure if replace or join is more efficient
    var data = values.join("\",\"");
    var id = document.getElementById('profileId');
    if (!id || id.value === "") {
        gDB.transaction(function(transaction){
            transaction.executeSql('REPLACE INTO profile ("' + list + '") VALUES ("' + data + '");',
             [],
             function(){/* null data handler*/},
             function(){ /* error handler  - not fatal*/ debugLog("error storing profile"); return false;}
            );
        }, basicTxnErrorDB, basicTxnSuccessDB);
    }else{
        gDB.transaction(function(transaction){
            for (var k = 0; k < profileFields.length; k++) { // there must be a way to update them all with one call?
                transaction.executeSql('UPDATE profile set "' + profileFields[k] + '"=? where profileId=?;',
                    [values[k], id.value],
                    function(){/* null data handler*/},
                    function(){ /* error handler  - not fatal*/ debugLog("error storing profile"); return false;}
                );
            }
        }, basicTxnErrorDB, basicTxnSuccessDB);
    }
}

/**
 * Load profile from database and populate form
 * Only supports primary for now -  needs work to load profiles from accident reporting
 *
 * @param isPrimary
 */
function loadProfile(isPrimary) {
    debugLog("loadProfile("+isPrimary+")");
    mysurance.profileChanged = false;

    // Clear all vehicles except "Add Vehicle" node
    var vList = document.getElementById("vList");
    var nodes = [];
    for (var i in vList.childNodes) {
        if ((vList.childNodes[i].nodeType === 1) && (vList.childNodes[i].id !== 'addItem')) {
            //debugLog(" - adding child to be removed: "+vList.childNodes[i].innerHTML);
            nodes.push(vList.childNodes[i]);
        }
    }
    for (var i in nodes) {
        vList.removeChild(nodes[i]);
    }

    // Load profile for user
    gDB.transaction(function(transaction){
        transaction.executeSql('SELECT * FROM profile WHERE isPrimary=1;',
            [],
            function(transaction, results){
                debugLog("loadProfile() callback");

                // If there is data for this user
                if (results.rows.length) {
                    debugLog(" - results.rows.length = " +results.rows.length);

                    // Populate profile form
                    var row = results.rows.item(0); // always take the first for now needs work to add profiles for accident reporting
                    for (var i = 0; i < profileFields.length; i++) {
                        debugLog(" - row["+profileFields[i]+"]: " + row[profileFields[i]])
                        var field = document.getElementById(profileFields[i]);
                        if (field) {
                            field.value = row[profileFields[i]];
                        }
                    }

                    // Store the profileId read from database for this user
                    document.getElementById("profileId").value = row['profileId'];
                    debugLog(" - profileId="+row['profileId']);

                    // Load vehicle data
                    transaction.executeSql('SELECT * FROM vehicles WHERE ownerId=?;',
                        [row['profileId']],
                        function(transcation, results){
                            debugLog(" - in load profile, get vehicles");

                            // If there are vehicles for this user
                            debugLog(" - results.rows.length = " +results.rows.length);
                            if (results.rows.length) {

                                try {
                                    // Add vehicles to list
                                    var parent = dijit.byId("vList");
                                    var addItem = document.getElementById("addItem");
                                    //debugLog(" - vList="+parent+" addItem="+addItem);
                                    for (var i = 0; i < results.rows.length; i++) {
                                        var row = results.rows.item(i);
                                        debugLog(" - vName="+row["vName"]+" vehicleId="+row["vehicleId"]);

                                        //var listWidget = dijit.byId("vList");
                                        var li = dojo.create("LI");
                                        li.setAttribute("vid", row["vehicleId"]);
                                        parent.containerNode.appendChild(li);
                                        //parent.insertBefore(addItem, li);
                                        var item = new dojox.mobile.ListItem({
                                            moveTo:"addVehicle",
                                            transition:"slide",
                                            label:row["vName"],
                                        }, li);
                                        item.startup();
                                        dojo.connect(item.domNode, "onclick", function() {
                                            viewVehicleClicked(this);
                                        });

                                        debugLog(" - inserted vehicle");
                                    }
                                } catch (e) {
                                    debugLog(" --- ERROR: "+e);
                                }
                            }
                        },
                        function(transaction, error){
                            debugLog("Nested txn error in loadProfile().");
                            return false;
                        });
                }
            },
            function(transaction, error){ debugLog("loadProfile() error."); return false;}
        );
    },basicTxnErrorDB, function(){debugLog("loadProfile() success.");});
}

/**
 * Store vehicle info in database for current user
 */
function storeVehicle() {
    debugLog("storeVehicle()");
    if (!mysurance.vehicleChanged) {
        debugLog(" - not changed: just return");
        return;
    }
    mysurance.vehicleChanged = false;

    // obvious overlap with storeProfile that could be combined
    // needs error handling!
    var values = new Array(vehicleFields.length);
    var field=null;

    // Don't store if no vehicle name causes problems when try to load
    var vName = document.getElementById('vName');
    if (!vName || vName.value === ""){
        return; //obviously needs better error handling!
    }

    // Build query
    for (var i=0; i<vehicleFields.length; i++){
        field=document.getElementById(vehicleFields[i]);
        values[i] = (field && field.value !== "") ? field.value : ""; // value needs quoting for db security
    }
    var list = vehicleFields.toString();
    list = list.replace(/,/g,"\",\"");  //not sure if replace or join is more efficient
    data = values.join("\",\"");

    // Get vehicleId from form
    // (only set if vehicle was selected from list, not set if add vehicle was selected)
    var id = document.getElementById('vehicleId');
    debugLog(" - id="+id.value);

    // If vehicleId not set, then this is a new vehicle
    if (!id || id.value === "") {
        debugLog(" SQL=INSERT INTO vehicles (" + list + ") VALUES (" + data + ")");
        gDB.transaction(function(transaction){
            transaction.executeSql('INSERT INTO vehicles ("' + list + '") VALUES ("' + data + '");',
            [],
            function(){ debugLog(" - success inserting into vehicles");},
            function(){ debugLog(" - error inserting into vehicles"); return false;}
            );
        }, basicTxnErrorDB, basicTxnSuccessDB);
    }

    // If vehicleId set, then this is an update
    else {
        var vid = id.value;
        gDB.transaction(function(transaction){
            for (var k = 0; k < vehicleFields.length; k++) { // there must be a way to update them all with one call?
                debugLog(' SQL=UPDATE vehicles set "' + vehicleFields[k] + '"=? where vehicleId=?;');
                debugLog("   value="+values[k]+" id="+vid);
                transaction.executeSql('UPDATE vehicles set "' + vehicleFields[k] + '"=? where vehicleId=?;',
                    [values[k], vid],
                    function(){ debugLog(" - success updating vehicle");},
                    function(){ debugLog(" - error updating vehicle"); return false;}
                );
            }
        }, basicTxnErrorDB, basicTxnSuccessDB);
    }
}

/**
 * Clear vehicle form
 */
function clearVehicleForm() {
    debugLog("clearVehicleForm()");
    for (var i=0; i<vehicleFields.length; i++){
        field=document.getElementById(vehicleFields[i]);
        field.value = "";
    }
    document.getElementById("vehicleId").value = "";
}

/**
 * Load vehicle info from database
 *
 * @param index         The vehicle id
 */
function loadVehicle(index) {
    debugLog("loadVehicle("+index+")");
    mysurance.vehicleChanged = false;

    gDB.transaction(function(transaction){
        transaction.executeSql('SELECT * FROM vehicles WHERE vehicleId=?;',
            [index],
            function(transaction, results){
                //results callback
                if (results.rows.length) {
                    var row = results.rows.item(0); // should only be one
                    for (var i = 0; i < vehicleFields.length; i++) {
                        var field = document.getElementById(vehicleFields[i]);
                        if (field) {
                            field.value = row[vehicleFields[i]];
                        }
                    }
                    document.getElementById("vehicleId").value = row['vehicleId']; //store the id on the page as well
                }
            },
            function(transaction, error){
                debugLog("txn error load vehicle");
                return false;
            }
        );
    },basicTxnErrorDB, basicTxnSuccessDB);
}

/**
 * Load accident information from database
 */
function loadAccidentInfo() {
    debugLog("loadAccidentInfo()");

    gDB.transaction(
        function(transaction) {
            var sql = 'SELECT * FROM accident;';
            debugLog(sql);
            transaction.executeSql(sql, [],
                function(transaction, results) {
                    for (var i=0; i<results.rows.length; i++) {
                        var row = results.rows.item(i);
                        var key = row['key'];
                        var value = row['value'];
                        var field = document.getElementById(key);
                        if (field) {
                            field.value = value;
                        }
                        else {
                            field.value = "";
                        }
                    }
                },
                function(transaction, error) {
                    debugLog("Error retreiving accident parameters.");
                    return false;
                }
            );
        },
        basicTxnErrorDB,
        basicTxnSuccessDB
    );
}

/**
 * Save accident information to database
 */
function storeAccidentInfo() {
    debugLog("storeAccidentInfo()");
    if (!mysurance.accInfoChanged) {
        debugLog(" - not changed: just return");
        return;
    }
    mysurance.accInfoChanged = false;

    gDB.transaction(
        function(transaction) {
            for (var i=0; i<accInfoField.length; i++) {
                var key = accInfoField[i];
                var field = document.getElementById(key);
                var value = (field && field.value !== "") ? field.value : ""; // value needs quoting for db security
                var sql = 'INSERT OR REPLACE INTO accident (key,value) VALUES ("'+key+'","'+value+'");';
                debugLog(sql);
                transaction.executeSql(sql, [],
                    function() { },
                    function() { debugLog("Error executing: "+sql); }
                );
            }
        },
        basicTxnErrorDB,
        basicTxnSuccessDB
    );
}

/**
 * Load accident location from database
 */
function loadLocation() {
    debugLog("loadLocation()");

    gDB.transaction(
        function(transaction) {
            var sql = 'SELECT * FROM location;';
            debugLog(sql);
            transaction.executeSql(sql, [],
                function(transaction, results) {
                    for (var i=0; i<results.rows.length; i++) {
                        var row = results.rows.item(i);
                        var key = row['key'];
                        var value = row['value'];
                        var field = document.getElementById(key);
                        if (field) {
                            field.value = value;
                        }
                        else {
                            field.value = "";
                        }
                    }
                },
                function(transaction, error) {
                    debugLog("Error retreiving location parameters.");
                    return false;
                }
            );
        },
        basicTxnErrorDB,
        basicTxnSuccessDB
    );
}

/**
 * Save accident location to database
 */
function storeLocation() {
    debugLog("storeLocation()");
    if (!mysurance.locationChanged) {
        debugLog(" - not changed: just return");
        return;
    }
    mysurance.locationChanged = false;

    gDB.transaction(
        function(transaction) {
            for (var i=0; i<locationFields.length; i++) {
                var key = locationFields[i];
                var field = document.getElementById(key);
                var value = (field && field.value !== "") ? field.value : ""; // value needs quoting for db security
                var sql = 'INSERT OR REPLACE INTO location (key,value) VALUES ("'+key+'","'+value+'");';
                debugLog(sql);
                transaction.executeSql(sql, [],
                    function() { },
                    function() { debugLog("Error executing: "+sql); }
                );
            }
        },
        basicTxnErrorDB,
        basicTxnSuccessDB
    );
}

/**
 * Load and display all photos from database
 */
function loadPhotos() {
    debugLog("loadPhotos()");

    gDB.transaction(
        function(transaction) {
            var sql = 'SELECT * FROM photos;';
            debugLog(sql);
            transaction.executeSql(sql, [],
                function(transaction, results) {
                    for (var i=0; i<results.rows.length; i++) {
                        var row = results.rows.item(i);
                        var key = row['key'];
                        var value = row['value'];
                        displayPhoto(key, value);
                    }
                },
                function(transaction, error) {
                    debugLog("Error retreiving location parameters.");
                    return false;
                }
            );
        },
        basicTxnErrorDB,
        basicTxnSuccessDB
    );
}

/**
 * Save photo to database
 *
 * @param index         The photo id
 * @param imageData     The photo data
 */
function storePhoto(id, imageData) {
    debugLog("storePhoto("+id+")");

    gDB.transaction(
        function(transaction) {
            var sql = 'INSERT OR REPLACE INTO photos (key,value) VALUES ("'+id+'","'+imageData+'");';
            //debugLog(sql);
            transaction.executeSql(sql, [],
                function() { },
                function() { debugLog("Error executing: "+sql); }
            );
        },
        basicTxnErrorDB,
        basicTxnSuccessDB
    );
}
