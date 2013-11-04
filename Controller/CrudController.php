<?php

/**
 * Created by JetBrains PhpStorm.
 * User: krun
 * Date: 17.09.13
 * Time: 15:35
 * To change this template use File | Settings | File Templates.
 */

namespace Hexmedia\AdministratorBundle\Controller;

use Doctrine\ORM\EntityManager;
use Hexmedia\AdministratorBundle\Controller\ListTrait;
use Symfony\Component\Form\Exception\OutOfBoundsException;
use Symfony\Component\HttpFoundation\Request;
use FOS\RestBundle\Controller\Annotations as Rest;
use FOS\RestBundle\Controller\FOSRestController as Controller;
use Hexmedia\AdministratorBundle\ControllerInterface\ListController as ListControllerInterface;

abstract class CrudController extends Controller implements ListControllerInterface {

	use ListTrait;

	/**
	 * @var \WhiteOctober\BreadcrumbsBundle\Model\Breadcrumbs
	 */
	protected $breadcrumbs;

	/**
	 * Index
	 *
	 * @param int $page
	 * @param int $pageSize
	 * @param string $sort
	 * @param string $sortDirection
	 *
	 * @Rest\View
	 */
	public function indexAction($page = 1, $pageSize = 15, $sort = 'id', $sortDirection = "ASC") {

	}

	/**
	 * Lists all entities.
	 *
	 * @Rest\View
	 */
	public function listAction($page = 1, $pageSize = 15, $sort = 'id', $sortDirection = "ASC") {
		$entities = $this->getRepository()->getPage($page, $sort, $pageSize, $sortDirection);

		$entitesRet = $this->prepareEntities($entities);

		return array(
			'entities' => $entitesRet,
			"entitiesCount" => $this->getRepository()->getCount()
		);
	}

	protected abstract function getRepository();

	/**
	 * Creates a new  entity.
	 */
	public function createAction(Request $request) {
		$this->registerBreadcrubms()->addItem($this->get("translator")->trans("Add"));

		$entity = $this->getNewEntity();
		$form = $this->createCreateForm($entity);
		$form->handleRequest($request);

		if ($form->isValid()) {
			$em = $this->getDoctrine()->getManager();

			try {
				if ($form->get("saveAndPublish")->isClicked()) {
					$entity->setPublished(1);
				}
			} catch (OutOfBoundsException $e) {

			}

			$em->persist($entity);
			$em->flush();

			$this->get('session')->getFlashBag()->add('notice', $this->getEntityName() . ' has been created!');

			if ($form->get("saveAndExit")->isClicked()) {
				return $this->redirect($this->generateUrl($this->getMainRoute(), $this->getRouteParameters()));
			} else {
				try {
					if ($form->get("addNext")->isClicked()) {
						return $this->redirect($this->generateUrl($this->getMainRoute() . "Add", $this->getRouteParameters()));
					}
				} catch (OutOfBoundsException $e) {

				}
				return $this->redirect($this->generateUrl($this->getMainRoute() . "Edit", $this->getRouteParameters(['id' => $entity->getId()])));
			}
		}

		return array(
			'entity' => $entity,
			'form' => $form->createView(),
		);
	}

	/**
	 * Registering BreadCrumbs
	 *
	 * @return \WhiteOctober\BreadcrumbsBundle\Model\Breadcrumbs
	 */
	protected abstract function registerBreadcrubms();

	protected abstract function getNewEntity();

	/**
	 * Creates a form to create an entity.
	 *
	 * @param mixed $entity The entity
	 *
	 * @return \Symfony\Component\Form\Form The form
	 */
	protected function createCreateForm($entity) {
		$form = $this->createForm(
			$this->getAddFormType(), $entity, [
			'action' => $this->generateUrl($this->getMainRoute() . "Add", $this->getRouteParameters()),
			'method' => 'POST',
			]
		);

		return $form;
	}

	protected abstract function getAddFormType();

	public abstract function getMainRoute();

	public abstract function getEntityName();

	/**
	 * Displays a form to create a new entity.
	 *
	 * @Rest\View
	 */
	public function addAction() {
		$this->registerBreadcrubms()->addItem($this->get("translator")->trans("Add"));

		$entity = $this->getNewEntity();
		$form = $this->createCreateForm($entity);

		return [
			'entity' => $entity,
			'form' => $form->createView(),
		];
	}

	/**
	 * Displays a form to edit an existing entity.
	 *
	 * @Rest\View
	 */
	public function editAction($id) {
		$this->registerBreadcrubms()->addItem($this->get("translator")->trans("Edit"));

		$entity = $this->getRepository()->find($id);

		if (!$entity) {
			throw $this->createNotFoundException('Unable to find ' . $this->getEntityName() . '.');
		}

		$editForm = $this->createEditForm($entity);

		return [
			'entity' => $entity,
			'form' => $editForm->createView(),
		];
	}

	/**
	 * Creates a form to edit an entity.
	 *
	 * @param mixed $entity The entity
	 *
	 * @return \Symfony\Component\Form\Form The form
	 */
	protected function createEditForm($entity) {
		$form = $this->createForm(
			$this->getEditFormType(), $entity, [
			'action' => $this->generateUrl($this->getMainRoute() . "Edit", $this->getRouteParameters(['id' => $entity->getId()])),
			'method' => 'PUT',
			]
		);

		return $form;
	}

	protected abstract function getEditFormType();

	/**
	 * Edits an existing entity.
	 */
	public function updateAction(Request $request, $id) {
		$this->registerBreadcrubms()->addItem($this->get("translator")->trans("Edit"));

		$entity = $this->getRepository()->find($id);

		if (!$entity) {
			throw $this->createNotFoundException('Unable to find ' . $this->getEntityName() . '.');
		}

		$form = $this->createEditForm($entity);
		$form->handleRequest($request);

		if ($form->isValid()) {
			/**
			 * @var $em \Doctrine\ORM\EntityManager
			 */
			$em = $this->getDoctrine()->getManager();

			try {
				if ($form->get("saveAndPublish")->isClicked()) {
					$entity->setPublished(1);
				}
			} catch (OutOfBoundsException $e) {

			}

			if ($em->getUnitOfWork()->isScheduledForUpdate($entity)) {
				$this->get('session')->getFlashBag()->add('notice', $this->getEntityName() . ' has been updated!');
			}

			$em->flush();

			if ($form->get("saveAndExit")->isClicked()) {
				return $this->redirect($this->generateUrl($this->getMainRoute(), $this->getRouteParameters()));
			} else {
				return $this->redirect($this->generateUrl($this->getMainRoute() . 'Edit', $this->getRouteParameters(['id' => $id])));
			}
		}

		return array(
			'entity' => $entity,
			'form' => $form->createView(),
		);
	}

	/**
	 * Deletes an entity.
	 *
	 * @Rest\View()
	 */
	public function deleteAction(Request $request, $id) {
		$entity = $this->getRepository()->find($id);

		if (!$entity) {
			throw $this->createNotFoundException('Unable to find ' . $this->getEntityName() . '.');
		}
		$em = $this->getDoctrine()->getManager();

		$em->remove($entity);

		$em->flush();

		return ['success' => true];
	}

	protected function getRouteAdditionalParameters() {
		return [];
	}

	protected function getRouteParameters($params = []) {
		return array_merge($params, $this->getRouteAdditionalParameters());
	}

}
