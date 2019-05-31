import React from 'react';
import { Animated, Alert, AsyncStorage, Button, StyleSheet, Text, View, Platform, Share, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Touchable from 'react-native-platform-touchable';
import Colors from '../constants/Colors';
import { ANIMATION_DURATION } from '../constants/Layout';
import { ActionIcon } from './TodoItem';
import RenameList from '../components/RenameList';

export const todoItemsMetaList = {
  active: 1,
  links: [
    {
      id: 1,
      label: 'My list',
      showDone: true,
    }
  ]
};

export default class SelectListsView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      metaList: todoItemsMetaList,
      edit: false,
      editableList: 0,
      showRenameList: false,
    };

    // todo - now it can be done onlt once - when app is init
    const willFocusSubscription = this.props.navigation.addListener('willFocus', this.loadMetaList);
  }

  activeList = () => {
    return this.state.metaList.links.find(it => it.id === this.state.metaList.active);
  };

  editableListName = () => {
    const list = this.state.metaList.links.find(it => it.id === this.state.editableList);
    return list ? list.label : 'no list selected';
  };

  toggleShowRenameList = (listId) => {

    this.setState(previousState => {
      return {
        showRenameList: !previousState.showRenameList,
        editableList: listId
      }
    });
  };

  onListNameUpdate = (value) => {
    this.setState(previousState => {
      const objIndex = previousState.metaList.links.findIndex((obj => obj.id == previousState.editableList));
      previousState.metaList.links[objIndex].label = value;
      return {
        metaList: {
          ...previousState.metaList,
          links: previousState.metaList.links
        }
      }
    }, this.saveMetaList);
  };

  loadMetaList = async () => {
    try {
      const value = await AsyncStorage.getItem('TODO_ITEMS_META_LIST');
      if (value) {
        this.setState({
          metaList: JSON.parse(value)
        });
      }
      else { // init first time
        this.setState({
          metaList: todoItemsMetaList
        }, this.saveMetaList);
      }
    }
    catch (err) {
      return console.log(err);
    }
  };

  itemsToList = (items) => {
    const labels = JSON.parse(items).map(item => item.text);
    let result = '';
    labels.forEach(label => result += (`- ${label}\n`));
    return result;
  };

  getListContent = async (listId) => {
    try {
      return this.itemsToList(await AsyncStorage.getItem('TODO_ITEMS_' + listId));
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  saveMetaList = () => {
    AsyncStorage.setItem('TODO_ITEMS_META_LIST', JSON.stringify(this.state.metaList));
  };

  doListDelete = id => this.setState(previousState => {
    const links = previousState.metaList.links.filter(obj => obj.id !== id);

    const active = id !== previousState.metaList.active
      ? previousState.metaList.active // remain current active
      : links.length !== 0 ? links[0].id : -1; // take  first from the rest
    return {
      metaList: {
        active: active,
        links: links
      }
    }
  }, () => {
    this.saveMetaList();
    AsyncStorage.removeItem('TODO_ITEMS_' + id);
    if (id == 1) { // backward compatibility, TODO remove on release
      AsyncStorage.removeItem('TODO_ITEMS');
    }
  });

  addNewList = () => {
    const id = new Date().getTime();
    this.setState(previousState => {
      oldLinks = previousState.metaList.links;
      let newList = {
        id,
        label: 'New list',
        showDone: true,
      }
      oldLinks.unshift(newList);
      return {
        metaList: {
          links: oldLinks,
          active: newList.id
        }
      };
    }, () => {
      this.saveMetaList();
      this.toggleShowRenameList(id);
      //let links = this.state.metaList.links;
      //this._handlePressListLink(links[0])();
    });
  };

  render() {
    return (
      <View style={styles.container}>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Touchable
            background={Touchable.Ripple('#66ff40', false)}
            onPress={this.addNewList}>
            <View style={[styles.optionIconContainer, { paddingLeft: 15 }]}>
              <Ionicons name="ios-add" size={35} color={Colors.iosDefault} />
            </View>
          </Touchable>

          <View style={{ paddingHorizontal: 10 }}>
            {!this.state.edit &&
              <Button
                onPress={() => {
                  this.setState({
                    edit: true,
                  })
                }}
                title='Edit' />
            }
            {this.state.edit &&
              <Button
                onPress={() => {
                  this.setState({
                    edit: false,
                  })
                }}
                title='Done' />
            }
          </View>
        </View>
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps='always'>
          {this.state.metaList.links.map(link =>
            <ListItem
              key={link.id}
              link={link}
              isActive={link.id == this.state.metaList.active}
              isEdit={this.state.edit}
              onPressLink={this._handlePressListLink}
              getListContent={this.getListContent}
              toggleShowRenameList={this.toggleShowRenameList}
              doListDelete={this.doListDelete}
            />)}

          {this.state.editableList &&
            <RenameList
              onUpdate={this.onListNameUpdate}
              initValue={this.editableListName}
              show={this.state.showRenameList}
              toggleShow={this.toggleShowRenameList}
            />
          }
        </ScrollView>
      </View>
    );
  }

  _handlePressListLink = (link) => () => {
    this.setState({
      edit: false,
      metaList: {
        ...this.state.metaList,
        active: link.id
      }
    }, this.saveMetaList);
    this.navigateToActive(link);
  };

  navigateToActive = (link) => {
    this.props.navigation.navigate('ActiveList', { name: link.label });
  };
}

class ListItem extends React.Component {

  constructor(props) {
    super(props);
    this._animated = new Animated.Value(0);
  }

  componentDidMount() {
    Animated.timing(this._animated, {
      toValue: 1,
      duration: ANIMATION_DURATION,
    }).start();
  }

  askDelete = (id) => {
    const runAnimation = () => {
      console.log('run animation')
      Animated.timing(this._animated, {
        toValue: 0,
        duration: ANIMATION_DURATION,
      }).start(() => this.props.doListDelete(id));
    }

    Alert.alert('Confirm list delete', 'Remove the list?', [
      {
        text: 'Yes',
        onPress: runAnimation,
      }, {
        text: 'Cancel',
        onPress: () => console.log('cancelled'),
        type: 'cancel'
      }]
    );
  }

  render() {
    const { link, isActive, isEdit, onPressLink, getListContent, toggleShowRenameList, doListDelete } = this.props;
    const rowStyles = [
      styles.option,
      { opacity: this._animated },
      {
        height: this._animated.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 68], // 68 - line height
          extrapolate: 'clamp',
        }),
      },
    ];
    if (isActive) {
      rowStyles.push(styles.activeOption);
    }

    return (
      <Animated.View
        key={link.id}
        style={rowStyles}>
        <Touchable
          background={Touchable.Ripple('#ccc', false)}
          style={{ flex: 1, overflow: 'hidden', }}
          onPress={onPressLink(link)}>

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 15 }}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="ios-list" size={22} color={isActive ? "#000" : "#ccc"} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionText}>
                {link.label}
              </Text>
            </View>
          </View>
        </Touchable>
        {isEdit &&
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={styles.optionIconContainer}>
              <ActionIcon
                icon='ios-paper-plane'
                color='#1284f7'
                click={async () => {
                  Share.share(
                    {
                      title: `Share a list ${link.label} with friend`,
                      message: await getListContent(link.id),
                      url: 'https://github.com/jaros/check-list',
                    }
                  );
                }}
              />
            </View>
            <View style={styles.optionIconContainer}>
              <ActionIcon
                icon='ios-create'
                click={() => toggleShowRenameList(link.id)}
                color='#1284f7'
              />
            </View>
            <View style={styles.optionIconContainer}>
              <ActionIcon
                icon='ios-trash'
                click={() => {
                  console.log('delete a list', link.id);
                  this.askDelete(link.id);
                }}
                color='#ff3b30' />
            </View>
          </View>
        }
      </Animated.View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    paddingBottom: 60,
    backgroundColor: '#fff',
  },
  optionsActive: {
    backgroundColor: Colors.logoLightColor,
  },
  optionIconContainer: {
    marginRight: 9,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fdfdfd',
    height: 44,
    paddingLeft: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',

    ...Platform.select({
      ios: {
        width: window.width - 30 * 2,
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOpacity: 1,
        shadowOffset: { height: 2, width: 2 },
        shadowRadius: 2,
      },

      android: {
        width: window.width - 30 * 2,
        elevation: 0,
        marginHorizontal: 30,
      },
    })
  },
  activeOption: {
    backgroundColor: Colors.logoLightColor,
  },
  optionText: {
    fontSize: 15,
    marginTop: 1,
  },
});
