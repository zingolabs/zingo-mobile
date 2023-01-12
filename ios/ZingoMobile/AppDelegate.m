#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>

#import <BackgroundTasks/BackgroundTasks.h>
#import "RPCModule.h"
#import "rust.h"

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

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:@"ZingoMobile"
                                            initialProperties:nil];

  rootView.backgroundColor = [[UIColor alloc] initWithRed:0.0f green:0.0f blue:0.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
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

- (BOOL)application:(UIApplication *)application willFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  if (@available(iOS 13.0, *)) {
      NSLog(@"configureProcessingTask");
      [self configureProcessingTask];
  }
  return YES;
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  if (@available(iOS 13.0, *)) {
      NSLog(@"scheduleProcessingTask");
      [self scheduleProcessingTask];
  }
}

static NSString* syncTask = @"Zingo_Processing_Task_ID";

-(void)configureProcessingTask {
    if (@available(iOS 13.0, *)) {
        [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncTask
                                                              usingQueue:nil
                                                           launchHandler:^(BGTask *task) {
            NSLog(@"configureProcessingTask");
            //[self scheduleLocalNotifications];
            [self handleProcessingTask:task];
        }];
    } else {
        // No fallback
    }
}

-(void)scheduleLocalNotifications {
    //do things
    NSLog(@"NotificationsProcessingTask");
}

-(void)handleProcessingTask:(BGTask *)task API_AVAILABLE(ios(13.0)){

  //do things with task
  [NSThread detachNewThreadSelector:@selector(syncingProcessBackgroundTask:) toTarget:self withObject:nil];
  [NSThread sleepForTimeInterval: 2.0];
  [NSThread detachNewThreadSelector:@selector(syncingStatusProcessBackgroundTask:) toTarget:self withObject:nil];

}

-(void)syncingProcessBackgroundTask:(NSString *)noValue {
  //do things with task
  BOOL exists = [self wallet__exists];

  if (exists) {

    NSLog(@"handleProcessingTask sync begin");
    _syncFinished = false;

    char *resp2 = execute("sync", "");
    NSString* respStr2 = [NSString stringWithUTF8String:resp2];
    rust_free(resp2);

    NSLog(@"handleProcessingTask sync end %@", respStr2);
    
    _syncFinished = true;

    if (![respStr2 hasPrefix:@"Error"]) {
      // Also save the wallet after sync
      RPCModule *rpcmodule = [RPCModule new];
      [rpcmodule saveWalletInternal];
      NSLog(@"handleProcessingTask save wallet");
    }

  } else {

    _syncFinished = true;
    NSLog(@"handleProcessingTask No exists wallet");
    
  }

}

-(void)syncingStatusProcessBackgroundTask:(NSString *)noValue {
  NSLog(@"handleProcessingTask sync status begin %i", _syncFinished);
  NSInteger prevBatch = -1;

  while(!_syncFinished) {
    [NSThread sleepForTimeInterval: 2.0];
    char *resp = execute("syncstatus", "");
    NSString* respStr = [NSString stringWithUTF8String:resp];
    rust_free(resp);
    NSLog(@"handleProcessingTask sync status response %@", respStr);

    NSData *data = [respStr dataUsingEncoding:NSUTF8StringEncoding];
    id jsonResp = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    NSString *batchStr = [jsonResp valueForKey:@"batch_num"];
    NSInteger batch = [batchStr integerValue];

    NSLog(@"handleProcessingTask batch number %@", batchStr);

    if (prevBatch != -1 && prevBatch != batch) {
      // save the wallet
      RPCModule *rpcmodule = [RPCModule new];
      [rpcmodule saveWalletInternal];
      NSLog(@"handleProcessingTask save wallet batch %@", batchStr);
    }
    prevBatch = batch;
  }

  RPCModule *rpcmodule = [RPCModule new];
  [rpcmodule saveWalletInternal];
  NSLog(@"handleProcessingTask sync status end %i", _syncFinished);
}

-(void)init__light__client {
  NSLog(@"handleProcessingTask light client begin");
  NSString *content = [self read__settings];
  NSData *data = [content dataUsingEncoding:NSUTF8StringEncoding];
  id jsonContent = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
  
  NSString *server = [jsonContent valueForKey:@"server"];

  NSLog(@"handleProcessingTask sync Server: %@", server);
      
  NSString* pathSaplingOutput = [[NSBundle mainBundle]
                      pathForResource:@"saplingoutput" ofType:@""];
  NSData* saplingOutput = [NSData dataWithContentsOfFile:pathSaplingOutput];


  NSString* pathSaplingSpend = [[NSBundle mainBundle]
                      pathForResource:@"saplingspend" ofType:@""];
  NSData* saplingSpend = [NSData dataWithContentsOfFile:pathSaplingSpend];

  NSArray *paths = NSSearchPathForDirectoriesInDomains
                    (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  char* resp = init_light_client([server UTF8String], [[saplingOutput base64EncodedStringWithOptions:0] UTF8String], [[saplingSpend base64EncodedStringWithOptions:0] UTF8String], [documentsDirectory UTF8String]);
  NSString* respStr = [NSString stringWithUTF8String:resp];
  rust_free(resp);

  NSLog(@"handleProcessingTask Light Client end: %@", respStr);
}

-(BOOL)wallet__exists {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
      (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  // Write to user's documents app directory
  NSString *fileName = [NSString stringWithFormat:@"%@/wallet.dat.txt",
                                                documentsDirectory];
  BOOL fileExists = [[NSFileManager defaultManager] fileExistsAtPath:fileName];
  // RCTLogInfo(@"Wallet exists: %d", (int)fileExists);

  if (fileExists) {
    return true;
  } else {
    return false;
  }
}

-(void)load__existing__wallet {
  NSLog(@"handleProcessingTask load wallet begin");

  NSString *content = [self read__settings];
  NSData *data = [content dataUsingEncoding:NSUTF8StringEncoding];
  id jsonContent = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
  
  NSString *server = [jsonContent valueForKey:@"server"];

  NSLog(@"handleProcessingTask sync Server: %@", server);

  NSString* walletDataStr = [self read__wallet];

  NSString* pathSaplingOutput = [[NSBundle mainBundle]
                      pathForResource:@"saplingoutput" ofType:@""];
  NSData* saplingOutput = [NSData dataWithContentsOfFile:pathSaplingOutput];

  NSString* pathSaplingSpend = [[NSBundle mainBundle]
                      pathForResource:@"saplingspend" ofType:@""];
  NSData* saplingSpend = [NSData dataWithContentsOfFile:pathSaplingSpend];

  NSArray *paths = NSSearchPathForDirectoriesInDomains
                    (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];
  char* seed = initfromb64([server UTF8String], [walletDataStr UTF8String], [[saplingOutput base64EncodedStringWithOptions:0] UTF8String], [[saplingSpend base64EncodedStringWithOptions:0] UTF8String], [documentsDirectory UTF8String]);
  NSString* seedStr = [NSString stringWithUTF8String:seed];
  rust_free(seed);

  NSLog(@"handleProcessingTask load wallet end %@", seedStr);
}

-(NSString *)read__wallet {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
                  (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  //make a file name to write the data to using the documents directory:
  NSString *fileName = [NSString stringWithFormat:@"%@/wallet.dat.txt",
                                                documentsDirectory];
  NSString *content = [[NSString alloc] initWithContentsOfFile:fileName
                                                usedEncoding:nil
                                                       error:nil];

  // RCTLogInfo(@"Read file");
  return content;
}

-(NSString *) read__settings {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
                  (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  //make a file name to write the data to using the documents directory:
  NSString *fileName = [NSString stringWithFormat:@"%@/settings.json",
                                                documentsDirectory];
  NSString *content = [[NSString alloc] initWithContentsOfFile:fileName
                                                usedEncoding:nil
                                                       error:nil];

  // RCTLogInfo(@"Read file");
  return content;
}

-(void)scheduleProcessingTask {
    if (@available(iOS 13.0, *)) {
        NSLog(@"schedulingProcessingTask");
        NSError *error = NULL;
        // cancel existing task (if any)
        [BGTaskScheduler.sharedScheduler cancelTaskRequestWithIdentifier:syncTask];
        // new task
        BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:syncTask];
        request.requiresNetworkConnectivity = YES;
        request.earliestBeginDate = nil;
        BOOL success = [[BGTaskScheduler sharedScheduler] submitTaskRequest:request error:&error];
        if (!success) {
            // Errorcodes https://stackoverflow.com/a/58224050/872051
            NSLog(@"Failed to submit request: %@", error);
        } else {
            NSLog(@"Success submit request %@", request);
        }
    } else {
        // No fallback
    }
}
@end
