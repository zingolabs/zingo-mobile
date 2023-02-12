import { Image } from "react-native"

type LogoProps = {}


const ZingoLogoImage: React.FunctionComponent<LogoProps> = ({ }) => {
    return <Image
        source={require('../assets/img/logobig-zingo.png')}
        style={{ width: 80, height: 80, resizeMode: 'contain' }}
    />
}

export default ZingoLogoImage
