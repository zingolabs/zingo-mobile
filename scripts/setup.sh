cd rust
./build.sh
cd ..
yarn install
killall node
nohup yarn react-native start > "out.yarn_react_native_start" &
