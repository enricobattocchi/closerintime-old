/**
 * Uses the DBs to populate the JSON array used to choose the events from
 */
function initJSONdata(){
	db.events.toArray(function(array){
		jsondata = array;
	}).then(function(){
		db.localevents.toArray(function(array){
			array.forEach(function(item){
				item.id = 0-item.id;
			});
			jsondata = jsondata.concat(array);
		}).then(function(){
			$('#chooser').removeClass('transparent');
			initEventEngine();
		}).catch(function (error){
			console.error('Failed to initialise local data: '+ error);
			initEventEngine();
		});
	}).catch(function (error) {
	    console.error ("Failed to initialise data: " + error);
		showFlAlert('Failed to initialise data!','danger');
	});
}

/**
 * initializes the IndexedDB (using Dexie library) with data from the server
 */
function initIndexedDB(){
	db = new Dexie("closerintime");

	db.version(17).stores({
		events: "id, name, year, month, day, type, plural, enabled, link, uuid",
		localevents: "++id, &name, year, month, day, type, plural, sent, link, &uuid"
	});
	

	db.on('ready', function () {
		return db.events.clear()
		.catch(function(error){
			console.error('Error clearing the DB: '+error);
			showFlAlert('There was an error initialising the database.<br/>Some older browsers may be not fully supported.','danger');
		})
		.then(function(){
			console.log("Database is empty. Populating from ajax call...");
			return new Dexie.Promise(function (resolve, reject) {
				$.ajax('/lookup.php', {
					type: 'get',
					dataType: 'json',
					error: function (xhr, textStatus) {
						// Rejecting promise to make db.open() fail.
						reject(textStatus);
					},
					success: function (data) {
						// Resolving Promise will launch then() below.
						jsondata = data;
						resolve();
					}
				});
			}).then(function () {
				console.log("Got ajax response. We'll now put the objects.");
				return db.events
					.bulkPut(jsondata);
			}).catch(Dexie.BulkError, function (e) {
			    console.error ("Some events not added. " + e.failures.length + " errors.");
			    showFlAlert('There was an error populating the database.<br/>Some older browsers may be not fully supported.','danger');
			}).then(function(){
				console.log("Added events");
				
				//  extract UUIDs
				var uuids = jsondata.map(function(item){
					return item.uuid;
				});	
				
				// delete local events with matching UUIDS
				return db.localevents
				.where('uuid')
				.anyOf(uuids)
				.delete();
			}).catch(function(error){
				console.error('error deleting superseded local events: ' + error);
				showFlAlert('There was an error syncing the local database.<br/>Some older browsers may be not fully supported.','warning');
			}).then(function (deleteCount) {
				if(deleteCount > 0){
					console.log( "Deleted " + deleteCount + " events");
				}
				
				// ask the server what happened to remaining submissions
				return db.localevents
				.orderBy('uuid')
				.filter(function(item){	return (item.type == 'submitted') && (item.sent == 1);	})
				.keys(function(uuids){
					var requestjson = {};
					if(uuids.length){
						
						return new Dexie.Promise(function (resolve, reject) {
							$.ajax('verify.php', {
								type: 'post',
								data: JSON.stringify(uuids),
								dataType: 'json',
								error: function (xhr, textStatus) {
									// Rejecting promise to make db.open() fail.
									reject(textStatus);
								},
								success: function (data) {
									console.log("Verification asked.");
									resolve(data);
								}
							});
						}).then(function(result) {
							console.log(result);
							
							db.transaction('rw', db.localevents, function () {
								
								if(result['to_move'] && result['to_move'].length){
									db.localevents
									.where('uuid')
									.anyOf(result['to_move'])
									.modify({type: 'personal'})
									.catch(function(error){
										console.error('error moving local events to personal list: ' + error);
									});
								}
								
								if(result['to_delete'] && result['to_delete'].length){
									db.localevents
									.where('uuid')
									.anyOf(result['to_delete'])
									.delete()
									.catch(function(error){
										console.error('error deleting substituted local events: ' + error);
									});
								}
							}).then(function(){
								showFlAlert('Local database updated','success');
								initJSONdata();
							}).catch(function(error){
								console.error('Failed transaction: '+ error.stack);
								showFlAlert('There was an error cleaning the local database.<br/>Some browsers may be not fully supported.','danger');
							});

						}).catch(function(error){
							showFlAlert('Error while querying the server for updates', 'warning');
							console.error('Failed AJAX verify: '+ error.stack);
						});
					}

				});
			}).then(function () {
				console.log ("Transaction committed");
				initJSONdata();
				loadComparison();
			}).catch(function (error){
				showFlAlert('There was an error verifying the local database. Some duplicate events could be appearing. ','warning');
				console.error('Failed filtering: '+ error.stack);
				initJSONdata();
				loadComparison();
			});
		});
	});


	db.open()
	.catch(function (error) {
		console.error(error.stack || error);
	});

}

/**
 * reads the events from the DB and starts the computation
 */
function computeFromIDB(){
	console.log("execute computeFromIDB");
	
	var data = new Array();
	db.transaction('r', db.events, db.localevents, function(){
		event_ids.forEach(function(event_id, index){
			if(event_id){
				var id = event_id;
				if(event_id < 0){
					id = Math.abs(event_id);
					db.localevents.get(id).then(function(item){
						item.id = 0-item.id;
						data[index] = item;
						event_objs[index] = item;
					}).catch (function (error) {
						console.error ("Error while getting event from DB: " + error);
					});
				} else {
					db.events.get(id).then(function(item){
						data[index] = item;
						event_objs[index] = item;
					}).catch (function (error) {
						console.error ("Error while getting event from DB: " + error);
					});
				}
			}
		});
	}).then(function(result){
		populateIDB(data);
	}).catch(function(error){
		console.error('Failed transaction: '+ error.stack);
	});
}