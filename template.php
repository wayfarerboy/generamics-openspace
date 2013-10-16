<?php

function generamics_openspace_theme() {
  $items = array();
  $items['user_login'] = array(
    'render element' => 'form',
    'path' => drupal_get_path('theme', 'generamics_openspace') . '/templates',
    'template' => 'user-login',
    'preprocess functions' => array('generamics_openspace_preprocess_user_login'),
  );
  return $items;
}

function generamics_openspace_preprocess_html(&$variables) {
  global $user;
  $user = user_load($user->uid);
  if ($user->uid != 1 && arg(0) == 'user' && arg(2) == 'edit' && arg(3) == 'twitter' && !isset($_GET['override'])) {
    drupal_goto('user/'.arg(1));
  } else if ($user->uid && count($user->twitter_accounts) > 0 && drupal_is_front_page()) {
    drupal_goto('events');
  } else if ($user->uid && arg(0) !== 'user' && count($user->twitter_accounts) == 0) {
    openspace_functions_twitter_account_message();
    drupal_goto('user/'.$user->uid);
  } else {
    // drupal_add_js('http://192.168.1.65:35729/livereload.js');
    if (module_exists('openspace_functions')) {
      if (drupal_get_title()) {
        if (!$user->uid && !drupal_is_front_page()) {
          $head_title = array( 'title' => 'Log in' );
          drupal_set_title('Log in');
        } else {
          $head_title = array( 'title' => strip_tags(drupal_get_title()) );
        }
        $head_title['name'] = check_plain(openspace_functions_get_site_name());
      } else {
        $head_title = array('name' => check_plain(openspace_functions_get_site_name()));
        if (variable_get('site_slogan', '')) {
          $head_title['slogan'] = filter_xss_admin(variable_get('site_slogan', ''));
        }
      }
      $variables['head_title_array'] = $head_title;
      $variables['head_title'] = implode(' | ', $head_title);
    }
  }
}

function generamics_openspace_preprocess_page(&$variables) {
  global $user;
  $node = NULL;
  if ($user->uid) {
    if (module_exists('openspace_functions')) {
      $variables['site_name'] = openspace_functions_get_site_name();
      $variables['logo'] = openspace_functions_get_site_logo();
    }
    $main_menu = '<i class="icon-reorder"></i>';
    $variables['main_menu_link'] = l($main_menu, 'events', array('html'=>true, 'attributes'=>array('id'=>'main-menu-link')));
    $variables['main_menu'] = '';
    if (in_array(arg(0), array('node', 'events')) && is_numeric(arg(1))) {
      $node = node_load(arg(1));
      if ($node->type == 'event') {
        $fids = field_get_items('node', $node, 'field_logo');
        foreach($fids as $file) {
          $variables['logo'] = image_style_url('logo', $file['uri']);
          $variables['site_name'] = $node->title;
          $variables['front_page'] = url('node/'.$node->nid);
          if (!arg(2)) {
            $variables['title'] = '';
          }
        }
      }
    }
    // Tab Tamer
    $unwanted_tabs = array('user/%/hybridauth', 'user/%/edit/twitter');
    foreach ($variables['tabs'] as $group_key => $tab_group) {
      if (is_array($tab_group)) {
        foreach ($tab_group as $key => $tab) {
          if (isset($tab['#link']['path']) && in_array($tab['#link']['path'], $unwanted_tabs)){
            unset($variables['tabs'][$group_key][$key]);
          } else if ($tab['#link']['title'] == 'View' && $node != NULL && $node->type == 'event') {
            $variables['tabs'][$group_key][$key]['#link']['title'] = 'Overview';
          }
        }
      }
    }
    if (isset($_GET['edit'])) {
      if (isset($_GET['edit']['field_question_ref'])) {
        $qid = $_GET['edit']['field_question_ref'][LANGUAGE_NONE];
        if ($qid) {
          $question = node_load($qid);
          $variables['title'] = 'Submit a post for <em>'.$question->title.'</em>';
        }
      } else {
        $eid = $_GET['edit']['field_event'][LANGUAGE_NONE];
        if ($eid) {
          $event = node_load($eid);
          $variables['title'] = 'Submit a question for <em>'.$event->title.'</em>';
        }
      }
    }
  } else {
    /*if (!drupal_is_front_page()) {
      $variables['title'] = 'Log in';
    }*/
  }
}

function generamics_openspace_preprocess_node(&$variables) {
  global $user;
  $variables['data'] = '';
  $variables['is_admin'] = $user->uid == $variables['node']->uid || in_array('superuser', $user->roles) || $user->uid == 1;
  if ($variables['node']->type == 'event') {
    if (!$user->uid) {
      drupal_access_denied();
    }
    $nid = $variables['node']->nid;
    $status = openspace_functions_get_event_status($nid);
    $terms = array();
    for ($i = 1; $i < 5; $i++) {
      $terms[] = taxonomy_term_load($i);
    }
    $variables['instructions'] = '';
    $variables['is_active'] = $status == 3;
    $variables['logo'] = drupal_render($variables['content']['field_logo']);
    if (!$variables['logo']) {
      $author = user_load($variables['node']->uid);
      $logos = field_get_items('user', $author, 'field_logo');
      $logoVal = field_get_value('user', $author, 'field_logo', $logos[0]);
      $variables['logo'] = drupal_render($logoVal);
    }
    if (!$variables['is_active'] && !$variables['page']) {
      $variables['status'] = drupal_render($variables['content']['field_status']);
    } else {
      if ($status != 3 && $variables['is_admin']) {
        $text = '<i class="icon-4x pull-left icon-border %s"></i>';
        $text .= '<h2>%s</h2>';
        $text .= '<p>%s</p>';
        $icons = array('icon-envelope-alt', 'icon-list-ol', 'icon-comments-alt', 'icon-archive');
        $suffix = array('node/'.$nid.'/invitations', 'node/'.$nid.'/questions', 'node/'.$nid, 'node/'.$nid.'/archive');
        $items = array();
        foreach($terms as $i => $term) {
          $item = array();
          $title = '<span class="stage-number">'.($i+1).'.</span> %s';
          $item['data'] = sprintf(
            $text, $status > $term->tid ? 'icon-check' : $icons[$i],
            sprintf($title, $status == $term->tid ? l($term->name, $suffix[$i]) : $term->name),
            $term->description
          );
          if ($status > $term->tid) {
            $item['class'] = array('complete');
          } else if ($status == $term->tid) {
            $item['class'] = array('active');
          }
          $items[] = $item;
        }
        $variables['instructions'] = theme('item_list', array('items'=>$items));
      } else if ($status != 3) {
        if ($status == 4) {
          $variables['instructions'] = '<p>'.t('This event has now concluded.').' Go to '.l('the archive', 'node/'.$variables['node']->nid.'/archive').' for more information.</p>';
        } else {
          $variables['instructions'] = '<p>'.t('This event isn\'t open yet.').' Go to '.l('My invitations', 'events').' for more information.</p>';
        }
      } else {
        $path = base_path().path_to_theme().'/js/';
        $dataStr = 'data-%s="%s"';
        $dataUrl = 'events/'.$variables['node']->nid.'/json/';
        $spaces_list = field_get_items('node', $variables['node'], 'field_max_concurrent_spaces');
        $dur = field_get_items('node', $variables['node'], 'field_max_question_duration');
        $duration = 0;
        if (count($dur) > 0) {
          $duration = $dur[0]['value'];
        }
        $logoIDs = field_get_items('node', $variables['node'], 'field_logo');
        if (count($logoIDs) == 0) {
          $author = user_load($variables['node']->uid);
          $logoIDs = field_get_items('user', $author, 'field_logo');
        }
        $variables['logo'] = theme('image_style', array('style_name'=>'profile', 'path'=>$logoIDs[0]['uri']));
        $data[] = sprintf($dataStr, 'eid', $variables['node']->nid);
        $data[] = sprintf($dataStr, 'url-posts', url('events/'.$variables['node']->nid.'/json/posts', array('absolute'=>true)));
        $data[] = sprintf($dataStr, 'url-questions', url('events/'.$variables['node']->nid.'/json/questions', array('absolute'=>true)));
        $data[] = sprintf($dataStr, 'url', url('events/'.$variables['node']->nid.'/ping', array('absolute'=>true)));
        $data[] = sprintf($dataStr, 'timestamp', openspace_functions_get_last_event_timestamp($variables['node']->nid));
        $data[] = sprintf($dataStr, 'duration', $duration);
        $data[] = sprintf($dataStr, 'uid', $user->uid);
        $variables['data'] = implode(' ', $data);
      }
    }
  } else if ($variables['node']->type == 'question') {
    $variables['title_suffix']['replacetitle']['#markup'] = '<h2 class="title">'.$variables['title'].'</h2>';
    $variables['title'] = '';
  }
}

function generamics_openspace_preprocess_taxonomy_term(&$variables) {
  $term = $variables['term'];
  if ($term->vid == 5) {
    $variables['twitter'] = '';
    $link = false;
    $uids = field_get_items('taxonomy_term', $term, 'field_users');
    if (count($uids) > 0) {
      $user = user_load($uids[0]['uid']);
      if (count($user->twitter_accounts) > 0) {
        $twitter = $user->twitter_accounts[0];
        $screen_name = $twitter->screen_name;
        $img = $twitter->profile_image_url;
        $fids = field_get_items('user', $user, 'field_picture');
        $view_mode = $variables['view_mode'];
        if (count($fids) > 0) {
          $style_name = 'profile';
          if ($view_mode == 'token') {
            $style_name = 'micro_profile';
            $link = true;
          }
          $img = image_style_url($style_name, $fids[0]['uri']);
        }
        $text = '<img class="swatch" src="%s" /> <span class="p-name">%s</span> <span class="p-nickname">@%s</span>';
        $output = sprintf($text, $img, $user->name, $screen_name);
        if ($link) {
          $output = l($output, 'https://twitter.com/intent/tweet', array('html'=>TRUE, 'query'=>array('screen_name'=>$screen_name), 'attributes'=>array('class'=>array('twitter-mention-button twitter-'.$view_mode), 'data-related'=>$screen_name)));
        }
        $variables['twitter'] = $output;
      }
    }
  }
}

function generamics_openspace_preprocess_block(&$variables) {
  $ids = array(
    'block-views-2b8b17b6b1cce50066fe658fee837fd9' => 'users',
    'block-views-question-sequence-block-1' => 'questions',
    'block-block-2' => 'login',
    'block-views-invitations-block-1' => 'invitations',
    'block-views-8daa96694e7829aa36e2862be4d41eb1' => 'friends',
    'block-views-5b9dd9b2a238a37c4c9a5b4f09e95fd7' => 'questions',
    'block-views-question-sequence-hashtags' => 'hashtags',
    'block-views-12998e0b963bfb66b78aaa9f56a185ff' => 'my-events',
  );
  
  if (isset($ids[$variables['block_html_id']])) {
    $variables['block_html_id'] = $ids[$variables['block_html_id']];
  } else {
    dpm($variables);
  }
}

function generamics_openspace_preprocess_user_login(&$variables) {
  $variables['form']['name']['#description'] = '';
  $variables['form']['pass']['#description'] = '';
  $variables['form']['name']['#attributes']['placeholder'] = $variables['form']['name']['#title'];
  $variables['form']['pass']['#attributes']['placeholder'] = $variables['form']['pass']['#title'];
  $variables['username'] = drupal_render($variables['form']['name']);
  $variables['twitter'] = drupal_render($variables['form']['twitter_signin']);
  $variables['password'] = drupal_render($variables['form']['pass']);
  $variables['form'] = drupal_render_children($variables['form']);
}

function generamics_openspace_preprocess_user_profile(&$variables) {
  global $user;
  if ($user->uid == 1 || in_array('organiser', $user->roles) || count($user->twitter_accounts) == 0) {
    if (count($user->twitter_accounts) == 0) {
      openspace_functions_twitter_account_message();
    }
    if (isset($variables['user_profile']['twitter'])) {
      $variables['data'] = '<div id="profile" class="loading has-account" data-url="'.url('user/'.$variables['user']->uid.'/edit/twitter', array('query'=>array('override'=>1))).' form#twitter-account-list-form"></div>';
    } else {
      $variables['data'] = '<div id="profile" class="loading no-account" data-url="'.url('user/'.$variables['user']->uid.'/edit/twitter', array('query'=>array('override'=>1))).' form#twitter-auth-account-form"></div>';
    }
  } else {
    drupal_goto('events');
  }
}

function generamics_openspace_preprocess_views_view(&$variables) {
  $filterCheck = array('invitations');
  if (in_array($variables['view']->name, $filterCheck)) {
    // Wrap exposed filters in a fieldset.
    if ($variables['exposed']) {
      drupal_add_js('misc/form.js');
      drupal_add_js('misc/collapse.js');
      // Default collapsed
      $collapsed = TRUE;
      $class = array('collapsible', 'collapsed');
      if (count($_GET) > 1){
        // assume other get variables are exposed filters, so expand fieldset
        // to show applied filters
        $collapsed = FALSE;
        $class = array('collapsible');
      }
      $fieldset['element'] = array(
        '#title' => 'Filter the list',
        '#collapsible' => TRUE,
        '#collapsed' => $collapsed,
        '#attributes' => array('class' => $class),
        '#children' => $variables['exposed'],
      );
      $variables['exposed'] = theme('fieldset', $fieldset);
    }
  }
}

