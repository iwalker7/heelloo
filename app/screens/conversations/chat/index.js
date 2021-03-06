import React, { useEffect, useReducer, useContext, Component } from 'react'
import { FlatList, SafeAreaView, View, ScrollView, Text, Image, KeyboardAvoidingView } from 'react-native'
import { firebase } from '@react-native-firebase/app'
import { firebaseService } from '../services'
import { BackBtn } from '../../../common';
import Input from '../Input'
import Message from '../Message'
import FastImage from 'react-native-fast-image'
import { chatRoomStyles as styles } from '../styles'

export default class Chat extends Component {
  constructor(props) {
    super(props);

    this.state = {
      messages: [],
      targetUser: null,
      user: {},
    }
    this.unsubscribe = null
  }



  async componentDidMount() {
    const user = await firebase.auth().currentUser;
    this.setState({ user: user });
    const { uid } = this.props.route.params;

    firebase.database().ref()
      .child('users')
      .child(uid)
      .once('value').then((snapshot) => {
        this.setState({ targetUser: snapshot.val() });
      });

    this.users_array = [user.uid, uid];

    if (user.uid > uid) {
      this.conversationId = uid + user.uid;
    }
    else {
      this.conversationId = user.uid + uid;
    }

    this.listen();
  }

  componentWillUnmount() {
    this.unsubscribe && this.unsubscribe()
  }

  listen = () => {

    firebaseService.messageRef.doc(this.conversationId)
      .set({
        users: this.users_array
      }, {
        merge: true
      });

    this.unsubscribe = firebaseService.messageRef
      .doc(this.conversationId)
      .collection('messages')
      .onSnapshot(snapshot => {
        let messages = [];
        snapshot.forEach(doc => {
          messages.push(doc);
        });

        messages = messages.sort(function (a, b) {
          const aData = a.data()
          const bData = b.data()
          return bData.created_at.seconds - aData.created_at.seconds
        });
        this.setState({ messages });
      });

  }

  showAvatar = () => {
    const { targetUser } = this.state;
    if (targetUser && targetUser.profileImg) {
      return <FastImage source={{ uri: targetUser.profileImg }} style={styles.profileHeader} />;
    } else {
      return <Image source={require('../../../images/no-avatar.png')} style={styles.profileHeader} />;
    }
  }
  header() {
    const { viewStyle, titleNavbar } = styles;
    const { targetUser } = this.state;
    return (
      <View style={viewStyle}>
        <BackBtn />
        {this.showAvatar()}
        <Text style={titleNavbar}>{targetUser ? targetUser.firstName : ''}</Text>
        <View style={{ width: 25, height: 25 }} />
      </View>
    );
  }
  render() {
    const { targetUser, user } = this.state;
    return (
      <View style={{ flex: 1 }}>
        {this.header()}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled>
          <View style={styles.messagesContainer}>
            <FlatList
              inverted
              style={{ flexGrow: 1 }}
              data={this.state.messages}
              keyExtractor={function (item) {
                return item.id
              }}
              renderItem={function ({ item }) {
                const data = item.data();
                const side = data.sender === user.uid ? 'right' : 'left';
                return (
                  <Message side={side} data={data} targetUser={targetUser} />
                )
              }}
            />
          </View>
          <View style={styles.inputContainer}>
            <Input conversationId={this.conversationId} sender={user.uid} />
          </View>
        </KeyboardAvoidingView>
      </View>
    )
  }
}
