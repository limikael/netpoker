<?php

	namespace wpnetpoker;

	require_once ABSPATH.'wp-admin/includes/class-wp-list-table.php';
	require_once __DIR__."/../utils/Template.php";
	require_once __DIR__."/WpCrudFieldSpec.php";

	use \WP_List_Table;

	/**
	 * Generic CRUD interface for Wordpress.
	 * Implemented by following this example:
	 *
	 * http://mac-blog.org.ua/wordpress-custom-database-table-example-full/
	 *
	 * Implementing classes should implement these functions:
	 *
	 * - createItem
	 * - getFieldValue
	 * - setFieldValue
	 * - saveItem
	 * - deleteItem
	 * - getItem
	 * - getAllItems
	 */
	abstract class WpCrud extends WP_List_Table {

		private $typeName;
		private $typeId;
		private $fields=array();
		private $listFields;
		private $editFields;
		private $submenuSlug;

		/**
		 * Constructor.
		 */
		public function __construct($typeName) {
			if (!$typeName)
				throw new Exception("no type name");

			$this->setTypeName($typeName);

			parent::__construct(array(
				"screen"=>$this->typeId
			));

			wp_register_script("jquery-datetimepicker",plugins_url()."/wpnetpoker/res/jquery.datetimepicker.js");
			wp_register_style("jquery-datetimepicker",plugins_url()."/wpnetpoker/res/jquery.datetimepicker.css");
		}

		/**
		 * Set submenu slug.
		 */
		protected function setSubmenuSlug($slug) {
			$this->submenuSlug=$slug;
		}

		/**
		 * Set the name of the type being managed.
		 */
		protected function setTypeName($name) {
			$this->typeName=$name;
			$this->typeId=strtolower(str_replace(" ", "", $name));
		}

		/**
		 * Add a field to be managed. This function returns a 
		 * WpCrudFieldSpec object, it is intended to be used something
		 * like this in the constructor:
		 *
		 *     $this->addField("myfield")->label("My Field")->...
		 */
		protected function addField($field) {
			$this->fields[$field]=new WpCrudFieldSpec($field);

			return $this->fields[$field];
		}

		/**
		 * Which fields should be editable?
		 */
		public function setEditFields($fieldNames) {
			$this->editFields=$fieldNames;
		}

		/**
		 * Which fields should be listable?
		 */
		public function setListFields($fieldNames) {
			$this->listFields=$fieldNames;
		}

		/**
		 * Get field spec.
		 * Internal.
		 */
		private function getFieldSpec($field) {
			if (!isset($this->fields[$field]))
				$this->addField($field);

			return $this->fields[$field];
		}

		/**
		 * Get edit fields.
		 */
		private function getEditFields() {
			if ($this->editFields)
				return $this->editFields;

			return array_keys($this->fields);
		}

		/**
		 * Get list fields.
		 */
		private function getListFields() {
			if ($this->listFields)
				return $this->listFields;

			return array_keys($this->fields);
		}

		/**
		 * Get columns.
		 * Internal.
		 */
		public function get_columns() {
			$a=array();
			$a["cb"]='<input type="checkbox" />';

			foreach ($this->getListFields() as $field) {
				$fieldspec=$this->getFieldSpec($field);
				$a[$field]=$fieldspec->label;
			}

			return $a;
		}

		/**
		 * Get checkbox column.
		 * Internal.
		 */
		public function column_cb($item) {
			return sprintf(
				'<input type="checkbox" name="_bulkid[]" value="%s" />', $item->id
			);
		}

		/**
		 * Column value.
		 */
		public function column_default($item, $column_name) {
			$listFields=$this->getListFields();

			if ($column_name==$listFields[0]) {
				$actions = array(
					'edit' => sprintf('<a href="?page=%s_form&id=%s">%s</a>', $this->typeId, $item->id, __('Edit', $this->typeId)),
					'delete' => sprintf('<a href="?page=%s&action=delete&id=%s" onclick="return confirm(\'Are you sure? This operation cannot be undone!\');">%s</a>', $_REQUEST['page'], $item->id, __('Delete', $this->typeId)),
				);

				return sprintf('%s %s',
					$item->$column_name,
					$this->row_actions($actions)
				);
			}

			return $item->$column_name;
		}

		/**
		 * Render the page.
		 */
		public function list_handler() {
			//echo "list handler, called=".get_called_class();

			$template=new Template(__DIR__."/../template/itemlist.php");

			if (isset($_REQUEST["action"]) && $_REQUEST["action"]=="delete") {
				$item=$this->getItem($_REQUEST["id"]);

				if ($item) {
					$this->deleteItem($item);
					$template->set("message","Item deleted.");
				}
			}

			if ($this->current_action()=="delete" && !empty($_REQUEST["_bulkid"])) {
				$numitems=0;

				foreach ($_REQUEST["_bulkid"] as $id) {
					$item=$this->getItem($id);

					if ($item) {
						$item->delete();
						$numitems++;
					}
				}

				$template->set("message",$numitems." item(s) deleted.");
			}

			$this->items=$this->getAllItems();

			$template->set("title",$this->typeName);
			$template->set("typeId",$this->typeId);
			$template->set("listTable",$this);
			$template->set("addlink",get_admin_url(get_current_blog_id(), 'admin.php?page='.$this->typeId.'_form'));
			$template->show();
		}

		/**
		 * Form handler.
		 * Internal.
		 */
		public function form_handler() {
			wp_enqueue_script("jquery-datetimepicker");
			wp_enqueue_style("jquery-datetimepicker");

			$template=new Template(__DIR__."/../template/itemformpage.php");

			if (wp_verify_nonce($_REQUEST["nonce"],basename(__FILE__))) {
				if ($_REQUEST["id"])
					$item=$this->getItem($_REQUEST["id"]);

				else
					$item=$this->createItem();

				foreach ($this->getEditFields() as $field) {
					$fieldspec=$this->getFieldSpec($field);
					$v=$_REQUEST[$field];

					// post process field.
					switch ($fieldspec->type) {
						case "timestamp":
							if ($v) {
								$oldTz=date_default_timezone_get();
								date_default_timezone_set(get_option('timezone_string'));
								$v=strtotime($v);
								date_default_timezone_set($oldTz);
							}

							else {
								$v=0;
							}

							break;
					}

					$this->setFieldValue($item,$field,$v);
				}

				$message=$this->validateItem($item);

				if ($message) {
					$template->set("notice",$message);
				}

				else {
					$this->saveItem($item);
					$template->set("message",$this->typeName." saved.");
				}
			}

			else if (isset($_REQUEST["id"]))
				$item=$this->getItem($_REQUEST["id"]);

			else
				$item=$this->createItem();

			add_meta_box($this->typeId."_meta_box",$this->typeName,array($this,"meta_box_handler"),$this->typeId, 'normal_'.$this->typeId, 'default');

			$template->set("title",$this->typeName);
			$template->set("nonce",wp_create_nonce(basename(__FILE__)));
			$template->set("backlink",get_admin_url(get_current_blog_id(), 'admin.php?page='.$this->typeId.'_list'));
			$template->set("metabox",$this->typeId);
			$template->set("metaboxContext","normal_".$this->typeId);
			$template->set("item",$item);
			$template->show();
		}

		/**
		 * Meta box handler.
		 * Internal.
		 */
		public function meta_box_handler($item) {
			$template=new Template(__DIR__."/../template/itemformbox.php");

			$fields=array();

			foreach ($this->getEditFields() as $field) {
				$fieldspec=$this->getFieldSpec($field);
				$v=$this->getFieldValue($item,$field);

				// pre process fields.
				switch ($fieldspec->type) {
					case "timestamp":
						if ($v) {
							$oldTz=date_default_timezone_get();
							date_default_timezone_set(get_option('timezone_string'));
							$v=date("Y-m-d H:i",$v);
							date_default_timezone_set($oldTz);
						}

						else {
							$v="";
						}

						break;
				}

				$fields[]=array(
					"spec"=>$fieldspec,
					"field"=>$fieldspec->field,
					"label"=>$fieldspec->label,
					"value"=>$v,
				);
			}

			$template->set("fields",$fields);
			$template->show();
		}

		/**
		 * Return array of bult actions if any.
		 */
		protected function get_bulk_actions() {
			$actions = array(
			    'delete' => 'Delete'
			);
			return $actions;
		}

		/**
		 * Validate item, return error message if
		 * not valid.
		 * Override in sub-class.
		 */
		protected function validateItem($item) {
		}

		/**
		 * Create a new item.
		 * Implement in sub-class.
		 */
		protected abstract function createItem();

		/**
		 * Get specified value from an item.
		 * Implement in sub-class.
		 */
		protected abstract function getFieldValue($item, $field);

		/**
		 * Set field value.
		 * Implement in sub-class.
		 */
		protected abstract function setFieldValue($item, $field, $value);

		/**
		 * Save item.
		 * Implement in sub-class.
		 */
		protected abstract function saveItem($item);

		/**
		 * Delete item.
		 * Implement in sub-class.
		 */
		protected abstract function deleteItem($item);

		/**
		 * Get item by it.
		 * Implement in sub-class.
		 */
		protected abstract function getItem($it);

		/**
		 * Get all items for list.
		 * Implement in sub-class.
		 */
		protected abstract function getAllItems();

		/**
		 * Main entry point.
		 */
		public static function admin_menu() {
			$instance=new static();

			if ($instance->submenuSlug)
				$screenId=add_submenu_page($instance->submenuSlug,$instance->typeName, $instance->typeName, "activate_plugins", $instance->typeId."_list", array($instance,"list_handler"));

			else
				$screenId=add_menu_page($instance->typeName, $instance->typeName, "activate_plugins", $instance->typeId."_list", array($instance,"list_handler"));

		    add_submenu_page(NULL, "Edit ".$instance->typeName, "Edit ".$instance->typeName, 'activate_plugins', $instance->typeId.'_form', array($instance,"form_handler"));
		}

		/**
		 * Set up.
		 */
		public static function init() {
			add_action("admin_menu",array(get_called_class(),"admin_menu"));
		}
	}
