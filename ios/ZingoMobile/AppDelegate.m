#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>

#import <BackgroundTasks/BackgroundTasks.h>
#import "RPCModule.h"
#import "rust.h"
#import "reachability.h"

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>

static void InitializeFlipper(UIApplication *application) {
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
}
#endif

@implementation AppDelegate

NSString* syncTask = @"Zingo_Processing_Task_ID";
NSString* syncSchedulerTask = @"Zingo_Processing_Scheduler_Task_ID";
BGProcessingTask *bgTask = nil;
NSString* timeStampStrStart = nil;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                            moduleName:@"Zingo!"
                                            initialProperties:nil];

  rootView.backgroundColor = [[UIColor alloc] initWithRed:0.0f green:0.0f blue:0.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  if (@available(iOS 13.0, *)) {
      NSLog(@"BGTask registerTasks");
      [self registerTasks];
  }

  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
 return [RCTLinkingManager application:application
                  continueUserActivity:userActivity
                  restorationHandler:restorationHandler];
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
  if (@available(iOS 13.0, *)) {
      // cancel existing sync process (if any).
      NSLog(@"BGTask foreground");
      [self stopSyncingProcess:nil];

      // cancel bg task
      if ([bgTask isKindOfClass:[BGTask class]]) {
           NSLog(@"BGTask foreground - sync task CANCEL");
           [bgTask setTaskCompletedWithSuccess:NO];
       }
       bgTask = nil;
  }
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  if (@available(iOS 13.0, *)) {
      // cancel existing sync process (if any).
      NSLog(@"BGTask background");
      [self stopSyncingProcess:nil];
      
      // cancel bg task
      if ([bgTask isKindOfClass:[BGTask class]]) {
          NSLog(@"BGTask background - sync task CANCEL");
          [bgTask setTaskCompletedWithSuccess:NO];
      }
      bgTask = nil;

      NSLog(@"BGTask background - scheduleBackgroundTask");
      [self scheduleBackgroundTask];
      NSLog(@"BGTask background - scheduleSchedulerBackgroundTask");
      [self scheduleSchedulerBackgroundTask];
  }
}

-(void)stopSyncingProcess:(NSString *)noValue {
  // if the in_progress from syncstatus is true
  // there is a sync progress running somehow
  // we need to stop it and the only tool I have is
  // using the `interrupting` sync flag...
  // and waiting for the end.
  @autoreleasepool {

    NSLog(@"BGTask stopSyncingProcess");
    char *status = execute("syncstatus", "");
    NSString* statusStr = [NSString stringWithUTF8String:status];
    rust_free(status);
    NSLog(@"BGTask stopSyncingProcess - status response %@", statusStr);
    
    if ([statusStr hasPrefix:@"Error"]) {
      NSLog(@"BGTask stopSyncingProcess - no lightwalled likely");
      return;
    }

    NSData *data = [statusStr dataUsingEncoding:NSUTF8StringEncoding];
    id jsonResp = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    NSString *inProgressStr = [jsonResp valueForKey:@"in_progress"];
    BOOL inProgress = [inProgressStr boolValue];

    while(inProgress) {
      char *interrupt = execute("interrupt_sync_after_batch", "true");
      NSString* interruptStr = [NSString stringWithUTF8String:interrupt];
      NSLog(@"BGTask stopSyncingProcess - interrupt syncing %@", interruptStr);

      [NSThread sleepForTimeInterval: 0.5];

      status = execute("syncstatus", "");
      statusStr = [NSString stringWithUTF8String:status];
      rust_free(status);
      NSLog(@"BGTask stopSyncingProcess - status response %@", statusStr);

      data = [statusStr dataUsingEncoding:NSUTF8StringEncoding];
      jsonResp = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
      inProgressStr = [jsonResp valueForKey:@"in_progress"];
      inProgress = [inProgressStr boolValue];
    }

    NSLog(@"BGTask stopSyncingProcess - syncing process STOPPED");

  }

}

-(void)syncingProcessBackgroundTask:(NSString *)noValue {
  //do things with task
  @autoreleasepool {
    
    RPCModule *rpcmodule = [RPCModule new];
    
    // save info in background json
    NSTimeInterval timeStampStart = [[NSDate date] timeIntervalSince1970];
    // NSTimeInterval is defined as double
    NSNumber *timeStampObjStart = [NSNumber numberWithDouble: timeStampStart];
    timeStampStrStart = [timeStampObjStart stringValue];
    NSString *jsonBackgroudStart = [NSString stringWithFormat: @"%@%@%@%@%@%@%@%@%@", @"{\"batches\": \"", @"0", @"\", \"message\": \"", @"Starting OK.", @"\", \"date\": \"", timeStampStrStart, @"\",  \"dateEnd\": \"", @"0", @"\"}"];
    [rpcmodule saveBackgroundFile:jsonBackgroudStart];
    NSLog(@"BGTask syncingProcessBackgroundTask - Save background JSON");
    
    NSLog(@"BGTask syncingProcessBackgroundTask");
    BOOL exists = [self wallet__exists];

    if (exists) {
      // check the Server, because the task can run without the App.
      char *balance = execute("balance", "");
      NSString* balanceStr = [NSString stringWithUTF8String:balance];
      NSLog(@"BGTask syncingProcessBackgroundTask - testing if server is active %@", balanceStr);
      rust_free(balance);
      if ([balanceStr hasPrefix:@"Error"]) {
        // this means this task is running with the App closed
        [self loadWalletFile:nil];
      } else {
        // this means the App is open,
        // stop syncing first, just in case.
        [self stopSyncingProcess:nil];
      }

      // we need to sync without interruption, I run this just in case
      char *noInterrupt = execute("interrupt_sync_after_batch", "false");
      NSString* noInterruptStr = [NSString stringWithUTF8String:noInterrupt];
      NSLog(@"BGTask syncingProcessBackgroundTask - no interrupt syncing %@", noInterruptStr);
      rust_free(noInterrupt);

      // the task is running here blocking this execution until this process finished:
      // 1. finished the syncing.
      // 2. interrupted by a flag then it finished the current batch.

      NSLog(@"BGTask syncingProcessBackgroundTask - sync BEGIN");

      char *syncing = execute("sync", "");
      NSString* syncingStr = [NSString stringWithUTF8String:syncing];
      rust_free(syncing);

      NSLog(@"BGTask syncingProcessBackgroundTask - sync END %@", syncingStr);

    } else {
      
      NSLog(@"BGTask syncingProcessBackgroundTask - No exists wallet file END");
      // save info in background json
      NSTimeInterval timeStampError = [[NSDate date] timeIntervalSince1970];
      // NSTimeInterval is defined as double
      NSNumber *timeStampObjError = [NSNumber numberWithDouble: timeStampError];
      NSString *timeStampStrError = [timeStampObjError stringValue];
      NSString *jsonBackgroudError = [NSString stringWithFormat: @"%@%@%@%@%@%@%@%@%@", @"{\"batches\": \"", @"0", @"\", \"message\": \"", @"No active wallet KO.", @"\", \"date\": \"", timeStampStrStart, @"\",  \"dateEnd\": \"", timeStampStrError, @"\"}"];
      [rpcmodule saveBackgroundFile:jsonBackgroudError];
      NSLog(@"BGTask syncingProcessBackgroundTask - Save background JSON");

      [bgTask setTaskCompletedWithSuccess:NO];
      bgTask = nil;
      return;

    }

    NSLog(@"BGTask syncingProcessBackgroundTask - syncing task STOPPED");

    // not sure if in this point the expirationhandler will be fired...
    // I'm gessing NO.

    // save the wallet
    [rpcmodule saveWalletInternal];
    NSLog(@"BGTask syncingProcessBackgroundTask - Save Wallet");

    // save info in background json
    NSTimeInterval timeStampEnd = [[NSDate date] timeIntervalSince1970];
    // NSTimeInterval is defined as double
    NSNumber *timeStampObjEnd = [NSNumber numberWithDouble: timeStampEnd];
    NSString *timeStampStrEnd = [timeStampObjEnd stringValue];
    NSString *jsonBackgroudEnd = [NSString stringWithFormat: @"%@%@%@%@%@%@%@%@%@", @"{\"batches\": \"", @"0", @"\", \"message\": \"", @"Finished OK.", @"\", \"date\": \"", timeStampStrStart, @"\",  \"dateEnd\": \"", timeStampStrEnd, @"\"}"];
    [rpcmodule saveBackgroundFile:jsonBackgroudEnd];
    NSLog(@"BGTask syncingProcessBackgroundTask - Save background JSON");

    [bgTask setTaskCompletedWithSuccess:YES];
    bgTask = nil;
  }

}

-(void)loadWalletFile:(NSString *)noValue {
  
  @autoreleasepool {
    
      NSArray *paths = NSSearchPathForDirectoriesInDomains
                      (NSDocumentDirectory, NSUserDomainMask, YES);
      NSString *documentsDirectory = [paths objectAtIndex:0];

      NSString *fileName = [NSString stringWithFormat:@"%@/settings.json",
                                                    documentsDirectory];
      NSString *content = [[NSString alloc] initWithContentsOfFile:fileName
                                                    usedEncoding:nil
                                                           error:nil];
      NSData *contentData = [content dataUsingEncoding:NSUTF8StringEncoding];
      NSDictionary *jsonObject = [NSJSONSerialization JSONObjectWithData:contentData options:kNilOptions error:nil];
    
      NSString *server = jsonObject[@"server"][@"uri"];
      NSString *chainhint = jsonObject[@"server"][@"chain_name"];
    
      NSLog(@"Opening the wallet file - No App active - server: %@ chain: %@", server, chainhint);
      RPCModule *rpcmodule = [RPCModule new];
      [rpcmodule loadExistingWallet:server chainhint:chainhint];
  }
  
}

-(BOOL)wallet__exists {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
      (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  // Write to user's documents app directory
  NSString *fileName = [NSString stringWithFormat:@"%@/wallet.dat.txt",
                                                documentsDirectory];
  BOOL fileExists = [[NSFileManager defaultManager] fileExistsAtPath:fileName];

  if (fileExists) {
    return true;
  } else {
    return false;
  }
}

// NEW BACKGROUND SCHEDULING TASKS

- (void)registerTasks {
    BOOL bcgSyncTaskResult;
    bcgSyncTaskResult = [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncTask usingQueue:dispatch_get_main_queue() 
      launchHandler:^(BGTask *task) {
        if (![task isKindOfClass:[BGTask class]]) {
            return;
        }
        NSLog(@"BGTask BGTaskScheduler.shared.register SYNC called");
        bgTask = (BGProcessingTask *)task;
        [self startBackgroundTask:nil];
    }];
    
    NSLog(@"BGTask SYNC registered %d", bcgSyncTaskResult);

    BOOL bcgSchedulerTaskResult;
    bcgSchedulerTaskResult = [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncSchedulerTask usingQueue:dispatch_get_main_queue() 
      launchHandler:^(BGTask *task) {
        if (![task isKindOfClass:[BGTask class]]) {
            return;
        }
        NSLog(@"BGTask BGTaskScheduler.shared.register SCHEDULER called");
        [self scheduleSchedulerBackgroundTask];
        [self scheduleBackgroundTask];
        [task setTaskCompletedWithSuccess:YES];
    }];
    
    NSLog(@"BGTask SCHEDULER registered %d", bcgSchedulerTaskResult);
}

- (void)startBackgroundTask:(NSString *)noValue {
    NSLog(@"BGTask startBackgroundTask called");
    
    // Schedule tasks for the next time
    [self scheduleBackgroundTask];
    [self scheduleSchedulerBackgroundTask];
    
    // Start the syncing
    NSLog(@"BGTask startBackgroundTask run sync task");
    // in order to run only one task
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_BACKGROUND, 0), ^{
      [self syncingProcessBackgroundTask:nil];
    });

    bgTask.expirationHandler = ^{
        NSLog(@"BGTask startBackgroundTask - expirationHandler called");
        // interrupting the sync process, I can't wait to see if the process is over
        // because I have no time enough to run all I need in this task.
        char *interrupt = execute("interrupt_sync_after_batch", "true");
        NSString* interruptStr = [NSString stringWithUTF8String:interrupt];
        NSLog(@"BGTask startBackgroundTask - expirationHandler interrupt syncing %@", interruptStr);
      
        RPCModule *rpcmodule = [RPCModule new];

        // save the wallet
        [rpcmodule saveWalletInternal];
        NSLog(@"BGTask startBackgroundTask - expirationHandler Save Wallet");

        // save info in background json
        NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
        // NSTimeInterval is defined as double
        NSNumber *timeStampObj = [NSNumber numberWithDouble: timeStamp];
        NSString *timeStampStr = [timeStampObj stringValue];
        NSString *jsonBackgroud = [NSString stringWithFormat: @"%@%@%@%@%@%@%@%@%@", @"{\"batches\": \"", @"0", @"\", \"message\": \"", @"Expiration fired. Finished OK.", @"\", \"date\": \"", timeStampStrStart, @"\",  \"dateEnd\": \"", timeStampStr, @"\"}"];
        [rpcmodule saveBackgroundFile:jsonBackgroud];
        NSLog(@"BGTask startBackgroundTask - expirationHandler Save background JSON");

        [bgTask setTaskCompletedWithSuccess:NO];
        bgTask = nil;
        NSLog(@"BGTask startBackgroundTask - expirationHandler THE END");
    };
}

- (void)scheduleBackgroundTask {
    // This method can be called as many times as needed, the previously submitted
    // request will be overridden by the new one.
    NSLog(@"BGTask scheduleBackgroundTask called");

    BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:syncTask];
    
    // PRODUCTION
    NSDate *today = [[NSCalendar currentCalendar] startOfDayForDate:[NSDate date]];
    NSDate *tomorrow = [[NSCalendar currentCalendar] dateByAddingUnit:NSCalendarUnitDay value:1 toDate:today options:0];
    
    NSDateComponents *earlyMorningComponent = [[NSDateComponents alloc] init];
    earlyMorningComponent.hour = 3;
    earlyMorningComponent.minute = arc4random_uniform(61);
    NSDate *earlyMorning = [[NSCalendar currentCalendar] dateByAddingComponents:earlyMorningComponent toDate:tomorrow options:0];
  
    NSLog(@"BGTask scheduleBackgroundTask date calculated: %@", earlyMorning);

    request.earliestBeginDate = earlyMorning;
    // zancas requeriment, not plug-in, reverted.
    request.requiresExternalPower = YES;
    request.requiresNetworkConnectivity = YES;
    
    NSError *error = nil;
    [[BGTaskScheduler sharedScheduler] submitTaskRequest:request error:&error];
    if (error) {
        NSLog(@"BGTask scheduleBackgroundTask failed to submit, error: %@", error);
    } else {
        NSLog(@"BGTask scheduleBackgroundTask succeeded to submit");
    }
}

- (void)scheduleSchedulerBackgroundTask {
    // This method can be called as many times as needed, the previously submitted
    // request will be overridden by the new one.
    NSLog(@"BGTask scheduleSchedulerBackgroundTask called");
    
    BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:syncSchedulerTask];
    
    // PRODUCTION
    NSDate *today = [[NSCalendar currentCalendar] startOfDayForDate:[NSDate date]];
    NSDate *tomorrow = [[NSCalendar currentCalendar] dateByAddingUnit:NSCalendarUnitDay value:1 toDate:today options:0];
    
    NSDateComponents *afternoonComponent = [[NSDateComponents alloc] init];
    afternoonComponent.hour = 14;
    afternoonComponent.minute = arc4random_uniform(61);
    NSDate *afternoon = [[NSCalendar currentCalendar] dateByAddingComponents:afternoonComponent toDate:tomorrow options:0];

    request.earliestBeginDate = afternoon;
    request.requiresExternalPower = NO;
    request.requiresNetworkConnectivity = NO;
    
    NSError *error = nil;
    [[BGTaskScheduler sharedScheduler] submitTaskRequest:request error:&error];
    if (error) {
        NSLog(@"BGTask scheduleSchedulerBackgroundTask failed to submit, error: %@", error);
    } else {
        NSLog(@"BGTask scheduleSchedulerBackgroundTask succeeded to submit");
    }
}

@end
